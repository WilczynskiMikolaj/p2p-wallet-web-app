export function safeNext(value: string | null): string {
  return value && /^\/app(?:\/|$)/.test(value) && !value.includes("\\")
    ? value
    : "/app";
}

export function validateSignup(name: string, password: string): string | null {
  if (name.trim().length < 1 || name.trim().length > 60)
    return "Nazwa musi mieć od 1 do 60 znaków.";
  if (password.length < 12) return "Hasło musi mieć co najmniej 12 znaków.";
  return null;
}

export function isAdmin(role: unknown): boolean {
  return role === "admin";
}
