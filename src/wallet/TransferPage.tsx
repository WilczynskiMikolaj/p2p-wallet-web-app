import { useRef, useState, type FormEvent } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { sendTransfer } from "./api";
import {
  formatAmount,
  rejection,
  review,
  uuid,
  type Fields,
  type Transfer,
} from "./domain";
import type { Account } from "./Views";

const empty: Fields = { recipient: "", amount: "", title: "" };
const storageKey = (id: string) => "web-transfer-pending:" + id;

function restore(id: string): Transfer | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey(id)) ?? "null");
    if (
      value &&
      uuid.test(value.key) &&
      uuid.test(value.recipient) &&
      Number.isSafeInteger(value.amountMinor) &&
      value.amountMinor > 0 &&
      typeof value.title === "string" &&
      value.title.trim().length > 0
    )
      return value;
  } catch {
  }
  return null;
}

export function TransferPage() {
  const { id } = useOutletContext<Account>();
  const [fields, setFields] = useState<Fields>(empty);
  const [order, setOrder] = useState<Transfer | null>(() => restore(id));
  const [submitted, setSubmitted] = useState(Boolean(order));
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  function update(field: keyof Fields, value: string) {
    setFields((previous) => ({ ...previous, [field]: value }));
    setError("");
  }
  function prepare(event: FormEvent) {
    event.preventDefault();
    try {
      const details = review(fields, id);
      setOrder({ ...details, key: crypto.randomUUID() });
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sprawdź dane przelewu.");
    }
  }
  async function confirm() {
    if (!order || sending.current) return;
    try {
      sessionStorage.setItem(storageKey(id), JSON.stringify(order));
    } catch {
      setError(
        "Włącz pamięć sesji przeglądarki, aby bezpiecznie wysłać przelew.",
      );
      return;
    }
    sending.current = true;
    setBusy(true);
    setSubmitted(true);
    setError("");
    try {
      const result = await sendTransfer(order);
      if ("transaction_id" in result) {
        setReceipt(result.transaction_id);
      } else {
        setError(rejection(result.error));
        if (result.error === "RATE_LIMIT") return;
        const minor = BigInt(order.amountMinor);
        setFields({
          recipient: order.recipient,
          title: order.title,
          amount:
            String(minor / 100n) + "," + String(minor % 100n).padStart(2, "0"),
        });
        setOrder(null);
        setSubmitted(false);
      }
      if (restore(id)?.key === order.key)
        sessionStorage.removeItem(storageKey(id));
    } catch {
      setError(
        "Nie udało się potwierdzić wyniku. Sprawdź historię lub ponów to samo zlecenie.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  if (receipt && order)
    return (
      <>
        <h1>Przelew zaksięgowany</h1>
        <section className="panel form-panel">
          <p role="status">
            Wysłano <strong>{formatAmount(order.amountMinor)}</strong>.
          </p>
          <dl>
            <dt>Odbiorca</dt>
            <dd>{order.recipient}</dd>
            <dt>Tytuł</dt>
            <dd>{order.title}</dd>
            <dt>Numer transakcji</dt>
            <dd>{receipt}</dd>
          </dl>
          <div className="actions">
            <Link className="button" to="/app/history">
              Zobacz historię
            </Link>
            <button
              className="secondary"
              onClick={() => {
                setOrder(null);
                setReceipt("");
                setSubmitted(false);
                setFields(empty);
                setError("");
              }}
            >
              Nowy przelew
            </button>
          </div>
        </section>
      </>
    );
  return (
    <>
      <h1>{order ? "Potwierdź przelew" : "Nowy przelew"}</h1>
      <section className="panel form-panel">
        {order ? (
          <>
            <dl>
              <dt>Kwota</dt>
              <dd className="review-amount">
                {formatAmount(order.amountMinor)}
              </dd>
              <dt>Identyfikator odbiorcy</dt>
              <dd>{order.recipient}</dd>
              <dt>Tytuł</dt>
              <dd>{order.title}</dd>
            </dl>
            {submitted && !busy && !error && (
              <p role="status">
                Oczekuje zlecenie wysłane z tej karty. Możesz bezpiecznie
                ponowić sprawdzenie.
              </p>
            )}
            <div className="actions">
              <button disabled={busy} onClick={confirm}>
                {busy
                  ? "Wysyłanie…"
                  : submitted
                    ? "Ponów to samo zlecenie"
                    : "Potwierdź i wyślij"}
              </button>
              {submitted ? (
                <Link to="/app/history">Historia transakcji</Link>
              ) : (
                <button
                  className="secondary"
                  onClick={() => {
                    setOrder(null);
                    setError("");
                  }}
                >
                  Wróć do edycji
                </button>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={prepare}>
            <label>
              Identyfikator odbiorcy
              <input
                autoComplete="off"
                required
                placeholder="UUID z profilu odbiorcy"
                value={fields.recipient}
                onChange={(e) => update("recipient", e.target.value)}
              />
            </label>
            <label>
              Kwota (PLN)
              <input
                inputMode="decimal"
                required
                placeholder="0,00"
                value={fields.amount}
                onChange={(e) => update("amount", e.target.value)}
              />
            </label>
            <label>
              Tytuł przelewu
              <input
                required
                value={fields.title}
                onChange={(e) => update("title", e.target.value)}
              />
            </label>
            <button>Sprawdź dane przelewu</button>
          </form>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>
    </>
  );
}
