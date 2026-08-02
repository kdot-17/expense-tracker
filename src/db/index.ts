import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Run `vercel env pull` or copy it from .env.example.",
    );
  }

  return drizzle(neon(url), { schema });
}

let db: ReturnType<typeof createDb> | null = null;

/**
 * Lazily builds the client on first use.
 *
 * Next evaluates top-level module code during `next build`, so constructing the
 * client at module scope would fail the build wherever DATABASE_URL is absent.
 *
 * Deliberately a plain function rather than a `Proxy` wrapper: a Proxy
 * intercepts the property probing that adapter libraries do, which breaks them
 * in ways that surface as hangs rather than errors.
 */
export function getDb() {
  if (!db) db = createDb();
  return db;
}
