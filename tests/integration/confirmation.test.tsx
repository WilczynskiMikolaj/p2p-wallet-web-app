// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { afterEach, expect, vi } from "vitest";
import { balances, dbTest } from "../support/database";
import { TransferPage } from "../../src/wallet/TransferPage";

const transport = vi.hoisted(() => vi.fn<typeof fetch>());
vi.mock("../../src/client", async () => {
  const { createClient } = await import("@supabase/supabase-js");
  return {
    supabase: createClient("https://wallet.invalid", "public-test-key", {
      accessToken: async () => "test-session",
      global: { fetch: transport },
    }),
  };
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  transport.mockReset();
});

dbTest(
  "wysyła dopiero po potwierdzeniu i wznawia to samo zlecenie po utracie odpowiedzi i ponownym otwarciu widoku",
  async ({ db }) => {
    const { id: sender } = await db.account(2000);
    const { id: recipient } = await db.account(0);
    const client = await db.login(sender);
    let requests = 0;
    transport.mockImplementation(async (url, init) => {
      if (
        String(url) !== "https://wallet.invalid/rest/v1/rpc/web_transfer" ||
        init?.method !== "POST"
      )
        throw new Error("Nieoczekiwane żądanie testowe");
      if (
        new Headers(init.headers).get("authorization") !== "Bearer test-session"
      )
        return new Response(null, { status: 401 });
      const args = JSON.parse(String(init.body));
      const result = await client.query(
        "select public.web_transfer($1,$2,$3,$4) as body",
        [args.p_recipient, args.p_amount_minor, args.p_title, args.p_key],
      );
      if (++requests === 1)
        throw new TypeError("Połączenie przerwane po zatwierdzeniu transakcji");
      return Response.json(result.rows[0].body);
    });
    const mount = () =>
      render(
        <MemoryRouter>
          <Routes>
            <Route
              element={
                <Outlet context={{ id: sender, name: "Anna", role: "user" }} />
              }
            >
              <Route index element={<TransferPage />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
    const first = mount();
    fireEvent.change(screen.getByLabelText("Identyfikator odbiorcy"), {
      target: { value: recipient },
    });
    fireEvent.change(screen.getByLabelText("Kwota (PLN)"), {
      target: { value: "12,30" },
    });
    fireEvent.change(screen.getByLabelText("Tytuł przelewu"), {
      target: { value: "Obiad" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Sprawdź dane przelewu" }),
    );
    expect(screen.getByText("12,30 zł")).toBeTruthy();
    expect(transport).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Potwierdź i wyślij" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "ponów to samo zlecenie",
    );
    first.unmount();
    mount();
    fireEvent.click(
      screen.getByRole("button", { name: "Ponów to samo zlecenie" }),
    );
    await screen.findByRole("heading", { name: "Przelew zaksięgowany" });
    const ledger = (
      await db.owner.query(
        "select id, title, amount_minor from public.transactions",
      )
    ).rows;
    expect(ledger).toEqual([
      { id: expect.any(String), title: "Obiad", amount_minor: "1230" },
    ]);
    expect(screen.getByText(ledger[0].id)).toBeTruthy();
    expect(await balances(db.owner, sender, recipient)).toEqual([770, 1230]);
    const bodies = transport.mock.calls.map(([, init]) =>
      JSON.parse(String(init?.body)),
    );
    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toEqual({
      p_recipient: recipient,
      p_amount_minor: 1230,
      p_title: "Obiad",
      p_key: expect.any(String),
    });
    expect(bodies[1]).toEqual(bodies[0]);
    expect(sessionStorage.length).toBe(0);
  },
);
