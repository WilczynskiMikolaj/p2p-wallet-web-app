import { useCallback, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { getHistory, getWallet, type Cursor } from "./api";
import { formatAmount, PAGE_SIZE } from "./domain";
import { useLiveRead } from "./useLiveRead";

export type Account = { id: string; name: string; role: "user" | "admin" };
const dateTime = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "medium",
});

function ReadError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="read-error" role="alert">
      {message}{" "}
      <button type="button" className="secondary" onClick={retry}>
        Ponów odczyt
      </button>
    </div>
  );
}

export function Overview() {
  const { id, name } = useOutletContext<Account>();
  const read = useCallback(() => getWallet(id), [id]);
  const { data, error, retry } = useLiveRead(read);
  return (
    <>
      <h1>Cześć, {name}.</h1>
      <div className="grid wallet-grid">
        <section className="panel accent">
          <h2>Saldo portfela</h2>
          {data ? (
            <>
              <strong className="balance">
                {formatAmount(data.balance_minor)}
              </strong>
              <p>
                {data.status === "active"
                  ? "Portfel aktywny"
                  : "Portfel zablokowany"}
              </p>
              {data.status === "active" && (
                <Link className="button" to="/app/transfers">
                  Wyślij przelew
                </Link>
              )}
            </>
          ) : (
            !error && <p role="status">Pobieranie salda…</p>
          )}
          {error && <ReadError message={error} retry={retry} />}
        </section>
        <section className="panel">
          <h2>Odbieraj przelewy</h2>
          <p>Podaj nadawcy swój identyfikator odbiorcy.</p>
          <code className="identifier">{id}</code>
          <Link to="/app/history">Zobacz historię →</Link>
        </section>
      </div>
    </>
  );
}

export function History() {
  const [pages, setPages] = useState<(Cursor | null)[]>([null]);
  const cursor = pages[pages.length - 1];
  return (
    <>
      <h1>Historia transakcji</h1>
      <HistoryPage
        key={cursor?.id ?? "first"}
        cursor={cursor}
        page={pages.length}
        previous={() => setPages((all) => all.slice(0, -1))}
        next={(value) => setPages((all) => [...all, value])}
      />
    </>
  );
}

function HistoryPage({
  cursor,
  page,
  previous,
  next,
}: {
  cursor: Cursor | null;
  page: number;
  previous: () => void;
  next: (value: Cursor) => void;
}) {
  const read = useCallback(() => getHistory(cursor), [cursor]);
  const { data, error, retry } = useLiveRead(read);
  const rows = data?.slice(0, PAGE_SIZE);
  return (
    <section className="panel">
      {error && <ReadError message={error} retry={retry} />}
      {!rows && !error && <p role="status">Pobieranie historii…</p>}
      {rows?.length === 0 && (
        <p>Brak zaksięgowanych operacji na tej stronie.</p>
      )}
      {rows && rows.length > 0 && (
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              Twoje zaksięgowane operacje, od najnowszej
            </caption>
            <thead>
              <tr>
                <th>Data i czas</th>
                <th>Tytuł</th>
                <th>Kierunek</th>
                <th>Kwota</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <time dateTime={row.created_at}>
                      {dateTime.format(new Date(row.created_at))}
                    </time>
                  </td>
                  <td>{row.title}</td>
                  <td>
                    {row.kind === "test_credit"
                      ? "Zasilenie testowe"
                      : row.direction === "out"
                        ? "Wychodzący"
                        : "Przychodzący"}
                  </td>
                  <td
                    className={
                      row.direction === "in" ? "amount incoming" : "amount"
                    }
                  >
                    {row.direction === "out" ? "−" : "+"}
                    {formatAmount(row.amount_minor)}
                  </td>
                  <td>Zaksięgowana</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(page > 1 || (data && data.length > PAGE_SIZE)) && (
        <div className="actions pagination">
          <button
            className="secondary"
            disabled={page === 1}
            onClick={previous}
          >
            Nowsze
          </button>
          <span>Strona {page}</span>
          <button
            className="secondary"
            disabled={!data || data.length <= PAGE_SIZE}
            onClick={() => {
              if (rows?.length) next(rows[rows.length - 1]);
            }}
          >
            Starsze
          </button>
        </div>
      )}
    </section>
  );
}
