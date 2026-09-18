// A single shared password gates /admin for v1 (SPEC §7) — no per-user
// accounts, so the cookie is just the password itself rather than a derived
// token. Keeps this file crypto-free so it works in both the Node route
// handlers and the Edge middleware that checks it on every /admin request.
export const ADMIN_COOKIE_NAME = "km_admin";

function configuredPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD is not set (see .env.example)");
  return password;
}

export function checkAdminPassword(candidate: string): boolean {
  try {
    return candidate === configuredPassword();
  } catch {
    return false;
  }
}

export function isValidAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  return checkAdminPassword(token);
}
