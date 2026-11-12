import { describe, it, expect } from "vitest";
import { safeNext, validateSignup, isAdmin } from "./policy";


describe("routing and authorization", () => {
  it("rejects external and protocol-relative redirects", () => {
    for (const path of [
      "https://evil.test",
      "//evil.test",
      "/app\\evil",
      "/application",
    ])
      expect(safeNext(path)).toBe("/app");
  });
  
  it("keeps an internal destination", () =>
    expect(safeNext("/app/profile")).toBe("/app/profile"));
  
  it("fails closed on missing or forged roles", () => {
    for (const role of [null, undefined, "user", "ADMIN", {}, true])
      expect(isAdmin(role)).toBe(false);
    expect(isAdmin("admin")).toBe(true);
  });

  it("validates names and password length", () => {
    expect(validateSignup(" ", "longpassword123")).not.toBeNull();
    expect(validateSignup("A".repeat(61), "longpassword123")).not.toBeNull();
    expect(validateSignup("Jan", "short")).not.toBeNull();
    expect(validateSignup("Jan", "longpassword123")).toBeNull();
  });
});
