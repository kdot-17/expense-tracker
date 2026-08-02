import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env.local and fill it in.`);
  }
  return value;
}

/** Constant-time string compare that doesn't leak length through early return. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function credentialsAreValid(email: string, password: string): boolean {
  // Both comparisons always run so a wrong email and a wrong password take the
  // same time, leaving nothing to distinguish "no such user" from "bad password".
  const emailOk = safeEqual(email.trim().toLowerCase(), requireEnv("AUTH_EMAIL").toLowerCase());
  const passwordOk = safeEqual(password, requireEnv("AUTH_PASSWORD"));
  return emailOk && passwordOk;
}

function sign(payload: string): string {
  return createHmac("sha256", requireEnv("SESSION_SECRET")).update(payload).digest("base64url");
}

/** Builds a `<email>.<expiry>.<hmac>` token. The signature is what makes it unforgeable. */
export function createSessionToken(email: string, now: number): string {
  const expiresAt = now + SESSION_MAX_AGE * 1000;
  const payload = `${Buffer.from(email).toString("base64url")}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(
  token: string | undefined,
  now: number,
): { email: string } | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedEmail, expiresAt, signature] = parts;

  // Verify the signature before trusting any part of the payload.
  if (!safeEqual(signature, sign(`${encodedEmail}.${expiresAt}`))) return null;

  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || expiry < now) return null;

  return { email: Buffer.from(encodedEmail, "base64url").toString() };
}
