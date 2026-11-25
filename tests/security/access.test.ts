import { expect } from "vitest";
import { dbTest, transfer, balances } from "../support/database";

dbTest(
  "RLS ogranicza odczyt salda i historii do właściciela i stron danej operacji",
  async ({ db }) => {
    const anna = await db.account(1000);
    const jan = await db.account(100);
    const ola = await db.account(0);
    const first = await db.login(anna.id);
    const third = await db.login(ola.id);
    const own = await transfer(first, jan.id, 250);
    const other = await transfer(await db.login(jan.id), ola.id, 100);
    expect(own.transaction_id).toEqual(expect.any(String));
    expect(other.transaction_id).toEqual(expect.any(String));
    expect(
      (await first.query("select id, balance_minor from public.wallets")).rows,
    ).toEqual([{ id: anna.wallet, balance_minor: "750" }]);
    expect(
      (await first.query("select id from public.transactions")).rows,
    ).toEqual([{ id: own.transaction_id }]);
    expect(
      (await third.query("select id from public.web_wallet_history()")).rows,
    ).toEqual([{ id: other.transaction_id }]);
  },
);

dbTest(
  "tylko zalogowany może zlecić przelew, a klient nie może sam zapisać salda ani księgi",
  async ({ db }) => {
    const a = await db.account(1000);
    const b = await db.account(0);
    const guest = await db.login(null);
    const client = await db.login(a.id);
    await expect(transfer(guest, b.id, 100)).rejects.toMatchObject({
      code: "42501",
    });
    await expect(
      client.query(
        "update public.wallets set balance_minor=1010 where user_id=$1",
        [a.id],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      client.query("delete from public.transactions"),
    ).rejects.toMatchObject({ code: "42501" });
    expect(await balances(db.owner, a.id, b.id)).toEqual([1000, 0]);
    expect(
      (await db.owner.query("select id from public.transactions")).rows,
    ).toEqual([]);
  },
);
