import { useEffect, useState } from "react";

export function useLiveRead<T>(read: () => Promise<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    let busy = false;
    async function refresh() {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const value = await read();
        if (active) {
          setData(value);
          setError("");
        }
      } catch {
        if (active) setError("Nie udało się odświeżyć danych portfela.");
      } finally {
        busy = false;
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 10_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [read, version]);
  return { data, error, retry: () => setVersion((v) => v + 1) };
}
