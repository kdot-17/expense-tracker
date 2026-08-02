# Environment variables

All of these are **server-only**. None may be given a `NEXT_PUBLIC_` prefix —
that would inline the value into the client bundle and publish it to the browser.

Local values live in `.env.local`, which is gitignored. `.env.example` lists the
credential variables — placeholder values for the email and password, and an
empty `SESSION_SECRET` for you to generate.

## Application variables

| Variable | Purpose |
| --- | --- |
| `AUTH_EMAIL` | The only email address allowed to sign in |
| `AUTH_PASSWORD` | That account's password |
| `SESSION_SECRET` | HMAC key that signs the session cookie. Generate with `openssl rand -base64 48` |

Each is read through a helper that throws a clear error when it is missing, so a
missing variable fails loudly at request time rather than silently allowing
something through.

## Database variables

Provisioned automatically by the Neon Marketplace integration and injected into
the Vercel project. `DATABASE_URL` is the one the app reads.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled connection string used by `getDb()` |
| `DATABASE_URL_UNPOOLED` | Direct connection, for tools that dislike a pooler |
| `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_URL_NO_SSL` | Alternative forms of the same connection |
| `PGHOST`, `PGHOST_UNPOOLED`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | Individual connection components |
| `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE` | Same, under Vercel's naming |
| `NEON_PROJECT_ID` | Identifies the Neon project |

`VERCEL_OIDC_TOKEN` is also present locally; Vercel writes it during `vercel link`
and it is short-lived.

## A trap worth knowing about

`vercel env pull` **overwrites `.env.local` entirely**, and it pulls the
Development environment by default.

`AUTH_EMAIL`, `AUTH_PASSWORD`, and `SESSION_SECRET` currently exist on Vercel for
the **Production environment only**. So running a plain `vercel env pull` will
remove all three from the local file and break local sign-in, while appearing to
succeed.

Two consequences:

- **Locally**, back up `.env.local` before pulling, or pull to a scratch file and
  merge the database variables in by hand.
- **On preview deployments**, those three variables are absent, so a preview
  builds successfully but fails at request time when something reads them.

The durable fix is to add all three to the Development and Preview environments
on Vercel, after which `vercel env pull` becomes safe.

## Setting up locally

```bash
cp .env.example .env.local     # fill in the credential values
vercel env pull --environment=development .env.scratch
# then copy the POSTGRES_*, PG*, DATABASE_URL and NEON_* lines into .env.local
rm .env.scratch
```

The scratch file **must** be named `.env.something`. `.gitignore` ignores `.env*`,
which matches on the leading `.env` — a file called `scratch.env` is *not*
ignored and would be committed with live database credentials in it.
