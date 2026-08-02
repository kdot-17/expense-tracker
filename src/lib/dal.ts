import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { getSession } from "./session";

/**
 * The actual security boundary. `proxy.ts` does an optimistic cookie check to
 * keep unauthenticated traffic off the app, but the docs are explicit that it
 * must not be the only line of defense — so anything reading real data calls
 * this instead. `cache` dedupes it across a single render pass.
 */
export const verifySession = cache(async (): Promise<{ email: string }> => {
  const session = await getSession();

  // redirect() throws, which is what narrows `session` to non-null below.
  if (!session) redirect("/login");

  return session;
});
