# Deployment

Hosted on Vercel as the project `expense-tracker` under the `kdot-17s-projects`
scope, connected to the GitHub repository `kdot-17/expense-tracker`.

## Branches and environments

The repository's default branch is **`trunk`**, which means pushes to `trunk`
deploy to **production**. There is no `main` branch. Every pull request gets its
own preview deployment.

Preview deployments sit behind Vercel's deployment protection, so opening one
without being signed in to Vercel redirects to an SSO page rather than the app.

## Checks

Pull requests run two Vercel checks — the deployment itself and preview comments.
There are no GitHub Actions workflows in this repository, so those two checks are
the entire CI surface. Type checking, linting, and building are expected to be run
locally before opening a PR.

## Database

Postgres is provisioned through the Vercel Marketplace as a Neon resource named
`neon-rose-engine`, in **`ap-southeast-1` (Singapore)** — Neon offers no Indian
region, and Singapore is the closest available. The region is fixed when the
database is created and cannot be changed afterwards; moving it would mean
provisioning a new database and migrating.

Installing the integration injected the connection variables into all three Vercel
environments automatically. See [environment.md](environment.md).

## A latency consideration

Vercel Functions default to Washington DC (`iad1`) unless the project says
otherwise. With the database in Singapore, every query would then cross the
Pacific and back. If response times matter, pin the compute to the same region as
the data by adding to `vercel.json`:

```json
{ "regions": ["sin1"] }
```

This has not been configured yet.

## Environment variables to fix before relying on previews

`AUTH_EMAIL`, `AUTH_PASSWORD`, and `SESSION_SECRET` currently exist on Vercel for
**Production only**. A preview deployment therefore builds successfully but has no
credentials at request time.

Adding all three to the Development and Preview environments fixes that, and also
makes `vercel env pull` safe to run — see [environment.md](environment.md) for
why it is currently dangerous.

## Useful commands

```bash
vercel env ls                   # names only; values stay encrypted
vercel integration list         # provisioned marketplace resources
vercel ls expense-tracker       # recent deployments
```
