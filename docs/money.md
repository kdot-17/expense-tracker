# Money

Every amount in this app is Indian rupees, stored as an **integer number of
paise**. Helpers live in `src/lib/money.ts`.

## Why paise and not a decimal

Floating point is never used for money — `0.1 + 0.2` style error would land
directly in someone's spend total. That leaves two exact options, and paise won:

- Postgres `numeric` is exact, but the driver returns it to JavaScript as a
  **string**, so every sum needs parsing or a decimal library. Chart.js wants
  numbers anyway.
- Integer paise stay exact in SQL *and* in JavaScript, which is safe to 2^53.
  The value is divided by 100 only at the display boundary.

There is no `currency` column. Everything is INR, and the column name
`amount_paise` makes the unit unambiguous. If multiple currencies are ever
needed, adding a column with a default of `'INR'` backfills every existing row
correctly.

## API

### `parseRupeesToPaise(input: string): number | null`

Converts what someone typed into paise. Returns `null` for anything
unparseable, so the caller can show a validation message instead of storing a
wrong number.

| Input | Result | Note |
| --- | --- | --- |
| `"254.2"` | `25420` | One decimal means 20 paise, **not** 2 |
| `"254.20"` | `25420` | |
| `"254"` | `25400` | |
| `"0.05"` | `5` | |
| `"₹1,23,456.78"` | `12345678` | Rupee sign and Indian grouping are stripped |
| `"8.115"` | `null` | More than two decimals is rejected, not rounded |
| `"-5"` | `null` | No negative amounts |
| `"abc"`, `""`, `"1e3"` | `null` | |
| `"21474836.48"` | `null` | Over the `integer` column ceiling |

`"0"` parses to `0`. That is a valid *parse* but not a valid expense — the
greater-than-zero rule is enforced by the caller and by a `CHECK` constraint.

### `formatPaise(paise: number): string`

Formats for display with Indian lakh/crore grouping.

| Input | Output |
| --- | --- |
| `25420` | `₹254.20` |
| `12345678` | `₹1,23,456.78` |
| `5` | `₹0.05` |

## Rules when handling amounts

- **Parse the string, never multiply a float.** Form values arrive from
  `FormData` as strings. `parseFloat(x) * 100` reintroduces exactly the binary
  fraction error that paise avoid — `1.005 * 100` is `100.4999…`, which rounds
  to `100` instead of `101`, and `4.475 * 100` lands on `447` instead of `448`.
  Not every value breaks, which is what makes it dangerous: the failures are
  scattered and only show up on specific amounts.
- **Pad the fraction before parsing.** `"254.2"` has a fractional part of `"2"`,
  meaning two *tenths* of a rupee, so it must become `20` paise. Reading it
  directly gives ₹254.02 — 18 paise lost here, and as much as 81 paise on other
  one-decimal entries.
- **Use a text input, not `type="number"`.** Pair `inputMode="decimal"` with a
  text input so the browser hands over the raw string rather than a float.
- **Divide by 100 only for display.** Never feed a divided value back into
  arithmetic that gets stored.
