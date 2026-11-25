export const MAX_MINOR = Number.MAX_SAFE_INTEGER;
export const PAGE_SIZE = 25;
export const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseAmount(value: string): number | null {
  const match = /^(\d{1,14})(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const minor =
    BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
  return minor > 0n && minor <= BigInt(MAX_MINOR) ? Number(minor) : null;
}

const wholeZlotys = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 0,
});
export function formatAmount(minor: number): string {
  const value = BigInt(minor);
  const fraction = String(value % 100n).padStart(2, "0");
  return wholeZlotys.format(value / 100n) + "," + fraction + " zł";
}

export type Transfer = {
  recipient: string;
  amountMinor: number;
  title: string;
  key: string;
};
export type Fields = { recipient: string; amount: string; title: string };

export function review(fields: Fields, actor: string): Omit<Transfer, "key"> {
  const recipient = fields.recipient.trim().toLowerCase();
  const title = fields.title.trim();
  const amountMinor = parseAmount(fields.amount);
  if (!uuid.test(recipient))
    throw new Error("Wpisz identyfikator odbiorcy z jego profilu.");
  if (recipient === actor.toLowerCase())
    throw new Error("Wybierz odbiorcę innego niż Ty.");
  if (amountMinor === null)
    throw new Error(
      "Podaj dodatnią kwotę w PLN z maksymalnie dwoma miejscami po przecinku.",
    );
  if (Array.from(title).length < 1 || Array.from(title).length > 140)
    throw new Error("Tytuł musi mieć od 1 do 140 znaków.");
  return { recipient, amountMinor, title };
}

const reasons: Record<string, string> = {
  RATE_LIMIT: "Zbyt wiele prób. Spróbuj ponownie za minutę.",
  INVALID_TRANSFER: "Sprawdź kwotę, odbiorcę i tytuł.",
  SELF_TRANSFER: "Wybierz odbiorcę innego niż Ty.",
  SENDER_UNAVAILABLE: "Twój portfel jest niedostępny.",
  RECIPIENT_UNAVAILABLE: "Portfel odbiorcy nie może przyjąć tego przelewu.",
  INSUFFICIENT_FUNDS: "Brak wystarczających środków.",
  KEY_CONFLICT:
    "Ten identyfikator zlecenia jest już przypisany do innego przelewu.",
};

export function rejection(code: string) {
  return reasons[code] ?? "Backend odrzucił przelew.";
}
