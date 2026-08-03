# Money

Every amount in this app is Indian rupees, stored as an **integer number of
paise**. Helpers live in `src/lib/money.ts`.

## One unit, everywhere

Paise is not just the storage format — it is the unit of every amount the code
ever holds:

| Layer | Unit |
| --- | --- |
| `expenses.amount_paise` in Postgres | integer paise |
| `src/lib/expenses.ts` — the data layer and its selectors | integer paise |
| Props passed into components, values handed to Chart.js | integer paise |
| What the reader sees on screen | rupees |

Rupees exist in exactly two places: the string someone types into a form, and
the string a formatter returns on the way to the screen. In between there is no
such thing as a rupee value. A number that means "1,200 rupees" never exists —
it is `120000` from the moment it is parsed until the moment it is printed.

### Amounts say so in their name

Any identifier holding money carries a `Paise` suffix — `amountPaise`,
`totalSpendPaise()`, `PREVIOUS_MONTH_TOTAL_PAISE`, `byDayPaise()`. So do the
formatters, which is the point of `formatPaise(paise)` rather than
`formatINR(amount)`: the second one reads as correct when handed rupees, and
that is how an amount ends up a hundred times too small with nothing failing.

The exceptions are values where the unit has cancelled or never applied —
`deltaPct` is a percentage, `busiestDay` is a day number. They take no suffix,
precisely so the suffix keeps meaning something.

The one place this rule is enforced by something other than habit is the
database, where the column is `amount_paise` and a `CHECK` keeps it positive.

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

The display format. Indian lakh/crore grouping, and the paise are shown.

| Input | Output |
| --- | --- |
| `25420` | `₹254.20` |
| `12345678` | `₹1,23,456.78` |
| `5` | `₹0.05` |
| `120000` | `₹1,200.00` |

Amounts are **not** rounded to the rupee for display. A round figure prints a
`.00` it did not strictly need, which is the cheaper of the two costs: the
alternative is a screen quietly disagreeing with what was entered, and a column
of rounded figures that does not add up to its own rounded total.

### `formatPaiseCompact(paise: number): string`

For places with no room for a full figure: axis ticks, calendar cells, and
treemap cells too narrow to hold one. Never a headline, and never a figure being
reported as exact.

| Input | Output |
| --- | --- |
| `99900` | `₹999` |
| `260000` | `₹2.6k` |
| `2940000` | `₹29.4k` |
| `12000000` | `₹1.2L` |

This one is an approximation by design: `₹2.6k` is already rounded, so below
₹1,000 it prints whole rupees rather than claiming a precision the rest of the
format does not have. Where the exact number matters, use `formatPaise`.

**Abbreviate rather than let a number clip.** A `₹1,340.08` cut off at a cell
edge reads as `₹1,340.0` — a wrong figure, not a truncated one. So the treemap
uses this format in its smallest tier, and throughout on the narrow phone
layout, where poster-scale type fills a cell only a couple of hundred pixels
wide. Every one of those cells still carries the exact amount in its `title`,
and the ledger carries all of them in full.

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
- **Divide by 100 only for display.** The division lives inside `money.ts` and
  nowhere else. Never feed a divided value back into arithmetic that gets
  stored, and never divide early to "work in rupees for a bit".
- **Thresholds are paise too.** A cut-off written as `1000` means ₹10, not
  ₹1,000. `rampStep` in `src/lib/palette.ts` is the live example — four cuts at
  `1_00_000`, `2_00_000`, `3_00_000` and `5_00_000` paise divide the ramp into
  five bands, and `RAMP_LABELS` beside it names those same bands in rupees for
  the reader. Change one list and you must change the other.
- **Aggregate in paise, format once.** Sum in integers all the way up and call a
  formatter at the point of render. Rounding each row and then adding the
  rounded values is how a total stops matching its own column.
