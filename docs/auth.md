# Authentication

The app has exactly one account. There is no user table, no sign-up, and no
password reset — the single valid email and password are read from environment
variables, and a signed cookie keeps someone signed in afterwards.

## Files

| File | Role |
| --- | --- |
| `src/lib/auth.ts` | Credential comparison and session token signing/verification |
| `src/lib/session.ts` | Reads and writes the session cookie |
| `src/lib/dal.ts` | The Data Access Layer — the real authorisation boundary |
| `src/proxy.ts` | Optimistic route gate that runs before pages render |
| `src/app/login/actions.ts` | The `login` and `logout` server actions |

## The session cookie

A cookie named `session`, valid for 7 days, containing three dot-separated parts:

```
base64url(email) . expiryMillis . hmacSha256(payload, SESSION_SECRET)
```

The signature is what makes it unforgeable — the payload is only trusted after
the HMAC is verified, and then only if the expiry is still in the future.

Cookie flags: `httpOnly` so `document.cookie` cannot read it, `secure` in
production only (a secure cookie would be dropped over `http://localhost`),
`sameSite: "lax"`, and `path: "/"`.

## Where authorisation is actually enforced

`src/proxy.ts` (the Next 16 rename of `middleware.ts`) redirects signed-out
visitors to `/login` and signed-in visitors away from it. It runs on the Node.js
runtime, so `node:crypto` is available for verifying the token.

**It is an optimistic check only.** It reads the cookie and never touches a data
source. Its matcher excludes `_next/static`, `_next/image`, `favicon.ico`,
`icon.svg` and `apple-icon.png` so static assets still load.

The three icon paths are listed separately because the metadata file convention
emits **one route per icon file**, and only `favicon.ico` was originally
excluded. Anything not on this list is redirected to `/login` when signed out —
which is precisely when the login page is trying to load its own tab icon. If
you add another metadata file (`icon1.png`, `opengraph-image.tsx`, a web app
manifest), add it here in the same change.

The real boundary is `verifySession()` in `src/lib/dal.ts`. Anything that reads
or writes real data calls it first; it redirects to `/login` when there is no
valid session. It is wrapped in React's `cache()`, so it runs once per render
pass no matter how many callers invoke it.

This split matters because **server actions are reachable by direct POST**, not
only through the app's own UI. A gate that only guards page navigation guards
nothing about the actions themselves.

## Server actions

Both live in `src/app/login/actions.ts`.

### `login(prevState: LoginState, formData: FormData): Promise<LoginState>`

Designed for React's form state hook. Reads `email` and `password` from the form.

- Returns `{ error }` when either field is empty.
- Returns `{ error }` when the credentials do not match.
- On success, writes the session cookie and redirects to `/`.

A wrong email and a wrong password produce the **same** message — *"That email
and password don't match."* — so the response cannot be used to work out whether
the email alone was right. (The empty-field case returns a different message,
which reveals nothing about the credentials.)

`credentialsAreValid` always evaluates both the email and the password
comparison before combining them, so neither short-circuits the other. Each uses
`timingSafeEqual`, though a length mismatch returns early — meaning the
comparison is constant-time only for inputs of the same length, and the length of
the configured credentials is not hidden.

The `redirect()` call sits outside any `try`/`catch`, because `redirect()`
signals by throwing and a catch block would swallow the navigation.

### `logout(): Promise<void>`

Clears the cookie and redirects to `/login`. It needs no session check, because
it only clears the caller's own cookie — the worst a stray POST achieves is
signing out someone already signed out.

### `addExpense(prevState, formData)` — `src/app/actions.ts`

The one write action, and the model for every future one: **its first line is
`await verifySession()`**, before a single field is read. It validates, resolves
the (vertical, subtype) names to ids, inserts, calls `revalidatePath("/")` and
returns `{ saved: true }` — no redirect; the dialog that posted it closes over
the board the same response re-rendered. Every failure returns
`{ error, field, values }` for the form rather than throwing, and constraint
violations are caught and rewritten into readable messages.

## Routes

| Route | Behaviour |
| --- | --- |
| `/` | Requires a session via `verifySession()`; shows the navbar and main area |
| `/login` | Sign-in form; redirects to `/` if already signed in |

Adding an expense is not a route — it is a dialog on `/` posting to the
`addExpense` action below.

`/login` repeats the signed-in check that `proxy.ts` already performs, so the
page stays correct if the proxy matcher ever changes.

## Adding a new protected page

1. Call `await verifySession()` at the top of the page component.
2. Call it inside every server action the page uses as well — a page-level check
   does not protect an action.
3. Never rely on `proxy.ts` alone.
