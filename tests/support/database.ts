import { randomUUID } from "node:crypto";
import pg from "pg";
import { inject, test } from "vitest";

type Database = {
  owner: pg.Client;
  account: (balance: number) => Promise<{ id: string; wallet: string }>;
  login: (id: string | null) => Promise<pg.Client>;
};

export const dbTest = test.extend<{ db: Database }>({
  db: async ({}, use) => {
    const config = inject("testPostgres");
    const admin = new pg.Client({ ...config, database: "postgres" });
    const database = "wallet_" + randomUUID().replaceAll("-", "");
    const clients: pg.Client[] = [];
    const connect = async () => {
      const client = new pg.Client({
        ...config,
        database,
        statement_timeout: 5000,
      });
      await client.connect();
      clients.push(client);
      return client;
    };
    await admin.connect();
    try {
      await admin.query(
        "create database " + database + " template wallet_template",
      );
      const owner = await connect();
      const account = async (balance: number) => {
        const id = randomUUID();
        await owner.query("insert into auth.users values ($1)", [id]);
        await owner.query(
          "insert into public.profiles(id,display_name) values ($1,'Test')",
          [id],
        );
        const row = await owner.query(
          "insert into public.wallets(user_id,balance_minor) values ($1,$2) returning id",
          [id, balance],
        );
        return { id, wallet: row.rows[0].id as string };
      };
      const login = async (id: string | null) => {
        const client = await connect();
        await client.query(id ? "set role authenticated" : "set role anon");
        if (id)
          await client.query(
            "select set_config('request.jwt.claim.sub',$1,false)",
            [id],
          );
        return client;
      };
      await use({ owner, account, login });
    } finally {
      await Promise.all(clients.map((c) => c.end()));
      try {
        await admin.query("drop database if exists " + database);
      } finally {
        await admin.end();
      }
    }
  },
});

export async function transfer(
  client: pg.Client,
  recipient: string,
  amount: number,
  key = randomUUID(),
  title = "Obiad",
) {
  const result = await client.query(
    "select public.web_transfer($1,$2,$3,$4) as result",
    [recipient, amount, title, key],
  );
  return result.rows[0].result as { transaction_id?: string; error?: string };
}

export async function balances(owner: pg.Client, ...users: string[]) {
  const result = await owner.query(
    "select balance_minor from public.wallets where user_id = any($1::uuid[]) order by array_position($1::uuid[],user_id)",
    [users],
  );
  return result.rows.map((row) => Number(row.balance_minor));
}

export async function overlapping<T>(
  owner: pg.Client,
  first: pg.Client,
  second: pg.Client,
  left: () => Promise<T>,
  right: () => Promise<T>,
): Promise<[T, T]> {
  const pid = (await second.query("select pg_backend_pid() as pid")).rows[0]
    .pid;
  await first.query("begin");
  let pending: Promise<T> | undefined;
  try {
    const firstResult = await left();
    pending = right();
    void pending.catch(() => {});
    const deadline = Date.now() + 2000;
    for (;;) {
      const { rows } = await owner.query(
        "select cardinality(pg_blocking_pids($1)) as n",
        [pid],
      );
      if (rows[0].n > 0) break;
      if (Date.now() >= deadline)
        throw new Error("Druga sesja nie czekała na blokadę");
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    await first.query("commit");
    return [firstResult, await pending];
  } finally {
    if (
      first.getTransactionStatus() === "T" ||
      first.getTransactionStatus() === "E"
    )
      await first.query("rollback");
    await pending?.catch(() => {});
  }
}
