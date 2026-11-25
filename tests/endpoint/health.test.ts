import { expect, it } from "vitest";
import { createServer } from "vite";
import { once } from "node:events";
import { createServer as httpServer } from "node:http";
import { fileURLToPath } from "node:url";

it("GET /health zwraca HTTP 200 i identyfikator działającej aplikacji", async () => {
  const vite = await createServer({
    configFile: fileURLToPath(new URL("../../vite.config.ts", import.meta.url)),
    server: { middlewareMode: true, hmr: false, watch: null },
    logLevel: "silent",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  const server = httpServer(vite.middlewares);
  try {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Brak portu HTTP");
    const response = await fetch(
      "http://127.0.0.1:" + address.port + "/health",
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      status: "ok",
      application: "P2P Wallet Web",
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await vite.close();
  }
});
