# Data and rendering conventions

How data moves through this app. These rules exist because the obvious approach
is wrong in a few specific places.

## Reads go through Server Components, not server actions

Filtering and totalling are **reads**, and reads belong in the page:

```tsx
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { range = "month", from, to } = await searchParams;
  // ...
}
```

Note that `searchParams` is a **Promise** and must be awaited.

Server actions are the wrong tool for filtering. They are POST-only and Next
dispatches them sequentially, so using one to fetch a filtered range gives an
uncacheable request queued behind any other action in flight, with the selected
range invisible in the URL.

Putting the filter in the URL instead gives shareable and bookmarkable views, a
working back button, and no client-side filter state to synchronise.

## Writes go through server actions

Creating, editing, and deleting are server actions. Every one of them calls
`verifySession()` first — server actions are reachable by direct POST, not only
through the app's own UI, so a page-level check protects nothing about the action
itself.

## Aggregate in SQL

```sql
SELECT vertical_id, SUM(amount_paise) AS total
FROM expenses
WHERE spent_on BETWEEN $1 AND $2
GROUP BY vertical_id
```

Not by fetching rows and reducing them in JavaScript, which ships every row to
compute one number per group.

Two things to watch:

- **`SUM(integer)` returns `bigint`, which the driver returns as a string.** Cast
  it or convert it explicitly.
- **Compute date ranges in `Asia/Kolkata`.** Server code runs in UTC. Deriving
  "this month" from the server clock puts an expense entered at 00:30 IST on the
  1st into the previous month, because it is still the previous day in UTC.

## Dates

Expense dates are calendar days, stored as `date` and handled as `"YYYY-MM-DD"`
strings. Avoid turning them into `Date` objects on the way in or out — that
reintroduces exactly the timezone conversion the `date` type avoids.

## Money

Never let a float touch an amount. Parse rupee input from the form string, store
whole paise, and divide by 100 only for display. See [money.md](money.md).

## Charts

Chart.js needs the browser, so a chart is a client component — but a **leaf** one.
The server computes the totals and passes plain numbers down as props. A client
component should never fetch or aggregate.

## Errors surfaced to the user

Database constraints are the source of truth, and some of them will be hit
through ordinary use:

- Renaming a vertical to a name that already exists raises a unique violation.
- Deleting a subtype that still has expenses raises a foreign key violation.

Server actions should catch these and return a readable message — *"A vertical
named Food already exists"*, *"4 expenses use this subtype"* — rather than
letting a raw Postgres error reach the page.
