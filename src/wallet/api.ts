import { supabase } from "../client";
import { uuid, type Transfer } from "./domain";

export type Wallet = { balance_minor: number; status: "active" | "blocked" };
export type Entry = {
  id: string;
  created_at: string;
  title: string;
  amount_minor: number;
  direction: "in" | "out";
  kind: "transfer" | "test_credit";
};
export type Cursor = Pick<Entry, "created_at" | "id">;
export type TransferResult = { transaction_id: string } | { error: string };

export async function getWallet(actor: string): Promise<Wallet> {
  const { data, error } = await supabase!
    .from("wallets")
    .select("balance_minor,status")
    .eq("user_id", actor)
    .single();
  if (error || !data) throw new Error("Nie udało się pobrać portfela.");
  return data as Wallet;
}

export async function getHistory(cursor: Cursor | null): Promise<Entry[]> {
  const { data, error } = await supabase!.rpc("web_wallet_history", {
    p_before_time: cursor?.created_at ?? null,
    p_before_id: cursor?.id ?? null,
  });
  if (error || !Array.isArray(data))
    throw new Error("Nie udało się pobrać historii.");
  return data as Entry[];
}

export async function sendTransfer(order: Transfer): Promise<TransferResult> {
  const { data, error } = await supabase!.rpc("web_transfer", {
    p_recipient: order.recipient,
    p_amount_minor: order.amountMinor,
    p_title: order.title,
    p_key: order.key,
  });
  if (
    !error &&
    typeof data?.transaction_id === "string" &&
    uuid.test(data.transaction_id)
  )
    return { transaction_id: data.transaction_id };
  if (!error && typeof data?.error === "string") return { error: data.error };
  throw new Error(
    "Nie udało się potwierdzić wyniku. Ponów to samo zlecenie, aby sprawdzić jego wynik.",
  );
}
