import { randomUUID } from "node:crypto";
import { expect } from "vitest";
import { balances, dbTest, overlapping, transfer } from "../support/database";

dbTest(
  "księguje przelew, aktualizuje oba salda i pokazuje obu stronom właściwy kierunek",
  async ({ db }) => {
    const sender = await db.account(10000);
    const recipient = await db.account(17);
    const from = await db.login(sender.id);
    const to = await db.login(recipient.id);
    const result = await transfer(from, recipient.id, 1250);
    expect(result.transaction_id).toEqual(expect.any(String));
    expect(await balances(db.owner, sender.id, recipient.id)).toEqual([
      8750, 1267,
    ]);
    const operation = {
      id: result.transaction_id,
      amount_minor: "1250",
      title: "Obiad",
      kind: "transfer",
    };
    expect(
      (await from.query("select * from public.web_wallet_history()")).rows,
    ).toEqual([
      { ...operation, direction: "out", created_at: expect.any(Date) },
    ]);
    expect(
      (await to.query("select * from public.web_wallet_history()")).rows,
    ).toEqual([
      { ...operation, direction: "in", created_at: expect.any(Date) },
    ]);
  },
);

dbTest(
  "odmowa lub błąd zapisu w księdze pozostawia obydwa salda i historię bez zmian",
  async ({ db }) => {
    const sender = await db.account(1000);
    const recipient = await db.account(0);
    const client = await db.login(sender.id);
    expect(await transfer(client, recipient.id, 1001)).toEqual({
      error: "INSUFFICIENT_FUNDS",
    });
    expect(await transfer(client, recipient.id, 0)).toEqual({
      error: "INVALID_TRANSFER",
    });
    await db.owner.query(
      "update public.wallets set status='blocked' where id=$1",
      [recipient.wallet],
    );
    expect(await transfer(client, recipient.id, 100)).toEqual({
      error: "RECIPIENT_UNAVAILABLE",
    });
    await db.owner.query(
      "update public.wallets set status='active' where id=$1",
      [recipient.wallet],
    );

    await db.owner.query(
      "alter table public.transactions add constraint test_ledger_failure check (amount_minor <> 123)",
    );
    await expect(transfer(client, recipient.id, 123)).rejects.toMatchObject({
      code: "23514",
    });
    expect(await balances(db.owner, sender.id, recipient.id)).toEqual([
      1000, 0,
    ]);
    expect(
      (await db.owner.query("select id from public.transactions")).rows,
    ).toEqual([]);
  },
);

dbTest(
  "równoczesne powtórzenie klucza zwraca jeden numer transakcji, a zmiana kwoty daje konflikt",
  async ({ db }) => {
    const a = await db.account(1000);
    const b = await db.account(0);
    const first = await db.login(a.id);
    const second = await db.login(a.id);
    const key = randomUUID();
    const [left, right] = await overlapping(
      db.owner,
      first,
      second,
      () => transfer(first, b.id, 900, key),
      () => transfer(second, b.id, 900, key),
    );
    expect(left.transaction_id).toEqual(expect.any(String));
    expect(right).toEqual(left);
    expect(await transfer(second, b.id, 100, key)).toEqual({
      error: "KEY_CONFLICT",
    });
    expect(await balances(db.owner, a.id, b.id)).toEqual([100, 900]);
    expect(
      (await db.owner.query("select id from public.transactions")).rows,
    ).toEqual([{ id: left.transaction_id }]);
  },
);

dbTest(
  "dwa jednoczesne zlecenia z różnymi kluczami nie wydają tych samych środków",
  async ({ db }) => {
    const a = await db.account(1000);
    const b = await db.account(0);
    const c = await db.account(0);
    const first = await db.login(a.id);
    const second = await db.login(a.id);
    const [left, right] = await overlapping(
      db.owner,
      first,
      second,
      () => transfer(first, b.id, 700),
      () => transfer(second, c.id, 700),
    );
    expect(left.transaction_id).toEqual(expect.any(String));
    expect(right).toEqual({ error: "INSUFFICIENT_FUNDS" });
    expect(await balances(db.owner, a.id, b.id, c.id)).toEqual([300, 700, 0]);
    expect(
      (await db.owner.query("select id from public.transactions")).rows,
    ).toEqual([{ id: left.transaction_id }]);
  },
);
