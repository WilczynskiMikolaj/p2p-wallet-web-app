import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  formatAmount,
  MAX_MINOR,
  parseAmount,
  review,
} from "../../src/wallet/domain";

it("zamienia kwotę z przecinkiem na dokładną liczbę groszy", () => {
  expect(parseAmount("1234,05")).toBe(123405);
});
it("akceptuje kropkę jako separator dziesiętny", () => {
  expect(parseAmount("0.1")).toBe(10);
});
it("odrzuca kwotę równą zero", () => {
  expect(parseAmount("0,00")).toBeNull();
});
it("odrzuca ułamek grosza bez zaokrąglania", () => {
  expect(parseAmount("19.999")).toBeNull();
});
it("odrzuca kwotę o grosz większą od limitu portfela", () => {
  expect(parseAmount("90071992547409,92")).toBeNull();
});
it("wyświetla ostatni grosz maksymalnego salda bez utraty precyzji", () => {
  expect(formatAmount(MAX_MINOR).replace(/\s/g, "")).toBe(
    "90071992547409,91zł",
  );
});
it("odrzuca własny identyfikator jako odbiorcę", () => {
  const actor = randomUUID();
  expect(() =>
    review({ recipient: actor, amount: "1", title: "Obiad" }, actor),
  ).toThrow("innego niż Ty");
});
it("odrzuca tytuł składający się z białych znaków", () => {
  expect(() =>
    review({ recipient: randomUUID(), amount: "1", title: "  " }, randomUUID()),
  ).toThrow("Tytuł");
});
