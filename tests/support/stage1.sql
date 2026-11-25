-- Minimalny schemat wejściowy Etapu 1 dla lokalnego klastra testowego.
create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key);
create table public.profiles (
  id uuid primary key references auth.users,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  created_at timestamptz not null default now()
);
create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles,
  balance_minor bigint not null default 0 check (balance_minor between 0 and 9007199254740991),
  currency text not null default 'PLN' check (currency = 'PLN'),
  status text not null default 'active' check (status in ('active','blocked')),
  created_at timestamptz not null default now()
);
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  sender_wallet_id uuid references public.wallets,
  recipient_wallet_id uuid not null references public.wallets,
  kind text not null check (kind in ('transfer','test_credit')),
  amount_minor bigint not null check (amount_minor between 1 and 9007199254740991),
  title text not null check (char_length(title) between 1 and 140),
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);
create table public.wallet_api_limits (
  user_id uuid not null references public.profiles, action text not null,
  window_start timestamptz not null, hits integer not null,
  primary key(user_id, action)
);
-- Symulacja wcześniejszych szerokich grantów i polityk ze współdzielonej bazy.
grant usage on schema public to anon, authenticated;
grant all on public.wallets, public.transactions, public.wallet_api_limits to anon, authenticated;
create policy test_existing_permissive on public.wallets for select to authenticated using (true);
create policy test_existing_permissive on public.transactions for select to authenticated using (true);

