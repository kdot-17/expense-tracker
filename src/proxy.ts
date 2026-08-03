import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, readSessionToken } from "@/lib/auth";

const LOGIN_PATH = "/login";

/**
 * Renamed from `middleware` in Next 16, and it runs on the Node.js runtime
 * (not Edge), so `node:crypto` in the token verifier is available here.
 *
 * This is an optimistic gate only: it reads the cookie and never touches a
 * data source. Real authorization lives in the Data Access Layer.
 */
export default async function proxy(request: NextRequest) {
  const session = readSessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
    Date.now(),
  );
  const { pathname } = request.nextUrl;

  if (!session && pathname !== LOGIN_PATH) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  if (session && pathname === LOGIN_PATH) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Without a matcher this would also run on CSS, JS and images and block them
  // from loading. Auth still wants coverage of every real route, so exclude
  // only the static asset paths.
  //
  // The app icons are three separate routes, not one: `favicon.ico`, `icon.svg`
  // and `apple-icon.png` are each emitted by the metadata file convention. All
  // three have to be reachable signed *out*, because the page that needs them
  // most is the login page — gate them and the tab falls back to a blank sheet,
  // and "add to home screen" from the login page gets nothing at all.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)"],
};
