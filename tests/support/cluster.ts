import EmbeddedPostgres from "embedded-postgres";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestProject } from "vitest/node";

export type LocalConnection = {
  host: string;
  port: number;
  user: string;
  password: string;
};
declare module "vitest" {
  export interface ProvidedContext {
    testPostgres: LocalConnection;
  }
}

async function availablePort(): Promise<number> {
  const socket = createServer();
  await new Promise<void>((resolve, reject) => {
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", resolve);
  });
  const address = socket.address();
  await new Promise<void>((resolve, reject) =>
    socket.close((e) => (e ? reject(e) : resolve())),
  );
  if (!address || typeof address === "string")
    throw new Error("Brak portu testowego");
  return address.port;
}

export default async function setup(project: TestProject) {
  const config = {
    host: "127.0.0.1",
    port: await availablePort(),
    user: "postgres",
    password: randomUUID(),
  };
  const root = await mkdtemp(join(tmpdir(), "p2p-wallet-test-"));
  const cluster = new EmbeddedPostgres({
    ...config,
    databaseDir: join(root, "db"),
    persistent: false,
    autoRehydrateSymlinks: true,
    authMethod: "scram-sha-256",
    initdbFlags: ["--encoding=UTF8", "--no-locale"],
    postgresFlags: ["-h", config.host, "-c", "unix_socket_directories="],
    onLog: () => {},
  });
  async function finish() {
    try {
      await cluster.stop();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
  try {
    await cluster.initialise();
    await cluster.start();
    const admin = cluster.getPgClient("postgres", config.host);
    await admin.connect();
    try {
      await admin.query("create database wallet_template");
    } finally {
      await admin.end();
    }
    const template = cluster.getPgClient("wallet_template", config.host);
    await template.connect();
    try {
      for (const path of [
        "./stage1.sql",
        "../../supabase/migrations/202611250001_stage2_transfers.sql",
      ]) {
        await template.query(
          await readFile(new URL(path, import.meta.url), "utf8"),
        );
      }
    } finally {
      await template.end();
    }
    project.provide("testPostgres", config);
    return finish;
  } catch (err) {
    await finish();
    throw err;
  }
}
