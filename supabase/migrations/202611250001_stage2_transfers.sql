-- Etap 2. Wymaga istniejących tabel Etapu 1 we wspólnym projekcie Supabase.
begin;

alter table public.wallets enable row level security;
alter table public.transactions enable row level security;

revoke all on public.wallets, public.transactions, public.wallet_api_limits
  from public, anon, authenticated;
grant select on public.wallets, public.transactions to authenticated;

-- Polityki ograniczające działają także obok wcześniejszych polityk permissive.
create policy web_wallet_read on public.wallets for select to authenticated
  using (user_id = (select auth.uid()));
create policy web_wallet_owner_only on public.wallets as restrictive for select to authenticated
  using (user_id = (select auth.uid()));

create policy web_ledger_read on public.transactions for select to authenticated
  using (true);
create policy web_ledger_participant_only on public.transactions as restrictive for select to authenticated
  using (exists (
    select 1 from public.wallets w
    where w.user_id = (select auth.uid())
      and w.id in (sender_wallet_id, recipient_wallet_id)
  ));

create index if not exists web_tx_sender_time
  on public.transactions(sender_wallet_id, created_at desc, id desc);
create index if not exists web_tx_recipient_time
  on public.transactions(recipient_wallet_id, created_at desc, id desc);

create function public.web_transfer(
  p_recipient uuid, p_amount_minor bigint, p_title text, p_key uuid
) returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  key_text text := 'web:p2p:' || actor::text || ':' || p_key::text;
  clean_title text := regexp_replace(p_title, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  sender public.wallets%rowtype;
  recipient public.wallets%rowtype;
  wallet public.wallets%rowtype;
  prior public.transactions%rowtype;
  receipt uuid;
  attempts integer;
  window_time timestamptz := date_trunc('minute', clock_timestamp());
  max_minor constant bigint := 9007199254740991;
begin
  if actor is null then
    raise insufficient_privilege using message = 'Wymagane logowanie';
  end if;

  -- Zwrócone odmowy domenowe zatwierdzają licznik, ale nic nie księgują.
  insert into public.wallet_api_limits as lim (user_id, action, window_start, hits)
  values (actor, 'web:p2p', window_time, 1)
  on conflict (user_id, action) do update
    set window_start = greatest(lim.window_start, excluded.window_start),
        hits = case when lim.window_start < excluded.window_start then 1
                    else least(lim.hits, 30) + 1 end
  returning hits into attempts;
  if attempts > 30 then
    return jsonb_build_object('error', 'RATE_LIMIT');
  end if;
  if p_recipient is null or p_key is null or p_amount_minor is null
     or p_amount_minor not between 1 and max_minor
     or clean_title is null or char_length(clean_title) not between 1 and 140 then
    return jsonb_build_object('error', 'INVALID_TRANSFER');
  end if;
  if p_recipient = actor then
    return jsonb_build_object('error', 'SELF_TRANSFER');
  end if;

  -- Stała kolejność zapobiega cyklowi blokad także przy przelewach A→B i B→A.
  for wallet in
    select w.* from public.wallets w where w.user_id in (actor, p_recipient)
      order by w.id for update
  loop
    if wallet.user_id = actor then sender := wallet;
    else recipient := wallet;
    end if;
  end loop;

  select * into prior from public.transactions where idempotency_key = key_text;
  if found then
    if prior.kind <> 'transfer' or prior.sender_wallet_id is distinct from sender.id
       or prior.recipient_wallet_id is distinct from recipient.id
       or prior.amount_minor <> p_amount_minor or prior.title <> clean_title then
      return jsonb_build_object('error', 'KEY_CONFLICT');
    end if;
    return jsonb_build_object('transaction_id', prior.id);
  end if;

  if sender.id is null or sender.status <> 'active' then
    return jsonb_build_object('error', 'SENDER_UNAVAILABLE');
  end if;
  if recipient.id is null or recipient.status <> 'active' then
    return jsonb_build_object('error', 'RECIPIENT_UNAVAILABLE');
  end if;
  if sender.balance_minor < p_amount_minor then
    return jsonb_build_object('error', 'INSUFFICIENT_FUNDS');
  end if;
  if recipient.balance_minor > max_minor - p_amount_minor then
    return jsonb_build_object('error', 'RECIPIENT_UNAVAILABLE');
  end if;

  update public.wallets set balance_minor = balance_minor - p_amount_minor where id = sender.id;
  update public.wallets set balance_minor = balance_minor + p_amount_minor where id = recipient.id;
  insert into public.transactions
    (sender_wallet_id, recipient_wallet_id, kind, amount_minor, title, idempotency_key)
  values (sender.id, recipient.id, 'transfer', p_amount_minor, clean_title, key_text)
  returning id into receipt;

  return jsonb_build_object('transaction_id', receipt);
end
$$;

-- 25 pozycji na ekranie. Dodatkowy wiersz wskazuje, że istnieje kolejna strona.
create function public.web_wallet_history(p_before_time timestamptz default null, p_before_id uuid default null)
returns table(id uuid, created_at timestamptz, title text, amount_minor bigint, direction text, kind text)
language sql stable security invoker set search_path = ''
as $$
  select t.id, t.created_at, t.title, t.amount_minor,
         case when t.sender_wallet_id = w.id then 'out' else 'in' end, t.kind
    from public.wallets w
    join public.transactions t on w.id in (t.sender_wallet_id, t.recipient_wallet_id)
    where w.user_id = (select auth.uid()) and (
      (p_before_time is null and p_before_id is null) or
      (t.created_at, t.id) < (p_before_time, p_before_id)
    )
    order by t.created_at desc, t.id desc
    limit 26
$$;

revoke all on function public.web_transfer(uuid,bigint,text,uuid),
  public.web_wallet_history(timestamptz,uuid) from public, anon, authenticated;
grant execute on function public.web_transfer(uuid,bigint,text,uuid),
  public.web_wallet_history(timestamptz,uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
