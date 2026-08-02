import "server-only";

import { cookies } from "next/headers";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  readSessionToken,
} from "./auth";

/**
 * Writes the session cookie. Next only allows cookie writes from a Server
 * Action or Route Handler — calling this during a page render throws.
 */
export async function createSession(email: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, createSessionToken(email, Date.now()), {
    httpOnly: true, // keeps document.cookie from reading it
    secure: process.env.NODE_ENV === "production", // http://localhost would drop a secure cookie
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Reads and verifies the session. Safe to call during render. */
export async function getSession(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  return readSessionToken(cookieStore.get(SESSION_COOKIE)?.value, Date.now());
}
