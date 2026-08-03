# UI and styling

## Styling, colour, type, dark mode

**See [`design-system.md`](design-system.md).** It is the authority on all of it.

This document used to describe the scaffold's original styling — Geist fonts,
`--background` / `--foreground` tokens, `prefers-color-scheme`-only dark mode
with no toggle. None of that is true any more, so rather than leave claims that
would mislead, that material now lives in one maintained place covering the
design and its non-negotiables, both validated themes, the frozen categorical
slots and the `npm run palette` checks that enforce them, the Chart.js rules,
and how theming resolves.

## Components

| Component | File | Kind |
| --- | --- | --- |
| `RootLayout` | `src/app/layout.tsx` | Server |
| `Dashboard` | `src/components/dashboard/dashboard.tsx` | Server |
| `TabShell` | `src/components/dashboard/tab-shell.tsx` | Client |
| `Tile` | `src/components/dashboard/tile.tsx` | Server |
| `KpiStrip` | `src/components/dashboard/kpi-strip.tsx` | Server |
| `Masthead` | `src/components/dashboard/masthead.tsx` | Server |
| `ThemeToggle` | `src/components/theme-toggle.tsx` | Client |
| `VerticalPie` / `SpendLine` / `SubtypeBars` | `src/components/dashboard/charts.tsx` | Client |
| `Treemap` | `src/components/dashboard/treemap.tsx` | Server |
| `CalendarBlock` | `src/components/dashboard/calendar.tsx` | Server |
| `VersusPrevious` | `src/components/dashboard/versus-previous.tsx` | Server |
| `Ledger` | `src/components/dashboard/ledger.tsx` | Server |
| `EmptyPlot` | `src/components/dashboard/empty.tsx` | Server |
| `LoginForm` | `src/app/login/login-form.tsx` | Client |
| `AddExpense` | `src/components/dashboard/add-expense.tsx` | Client |

Only the five that need a canvas or browser state are Client Components. The
treemap looks interactive and is not — it is percentage-positioned divs, so it
renders on the server and costs nothing on the client. `TabShell` is a Client
Component but its *panels* are not: they are rendered on the server and passed
in as props, so switching tabs ships no new markup and no data to the browser.

### Dashboard

Decides which module sits in which tab and which grid cell, and computes the
plain values the client charts are handed — the client boundary is drawn here.
It receives the period and the fetched `MonthData` from the page, runs the
pure selectors from `@/lib/expenses`, and passes arrays and numbers down; a
chart never aggregates. The seven modules are split by the question they
answer — Overview, Breakdown, Ledger — rather than stacked in reading order.
Layout rules that a change here can break, including why `flex-none` sits
beside `h-dvh`, are in [`design-system.md` §7](design-system.md).

### TabShell

Follows the ARIA tabs pattern: arrow keys, `Home` and `End` move between tabs,
only the active tab is in the tab order, and each panel is labelled by its tab.
A row of buttons that only answers to clicks would be a worse control than the
scrolling it replaced.

It renders **only the active panel**. Keeping the others mounted behind
`display: none` gives their Chart.js canvases a zero-size parent, which
`maintainAspectRatio: false` never recovers from.

### KpiStrip

Total, movement against last month, largest vertical, days active. Every value
is derived; with nothing recorded each is an em dash rather than `₹0`, and the
comparison is withheld rather than shown as "no change" — see the honesty rule
in [`AGENTS.md`](../AGENTS.md).

### Tile

A bordered box with a micro-caps header carrying the module's number and name.
Its body is `overflow-hidden`, which is load-bearing rather than tidy: a module
whose scroll box outgrows its cell paints over its neighbours otherwise.

### RootLayout

Sets the page title and description, applies the font variables, injects the
pre-paint theme bootstrap script, and makes the body a full-height flex column
so pages can grow into the available space.

### Masthead

The app chrome and the poster's masthead are the same object — a separate navbar
above a design that already opens with a full-bleed dark band would be two
headers stacked, so the theme toggle, sign-out and the **Add expense** control
all live inside the band. Sign-out is a plain `<form>` posting to the `logout`
server action: it needs no `"use client"` and works if the client bundle never
loads. Add expense leads the control group — the one control that creates data
comes before the chrome — is written out in words rather than a "+" glyph, and
opens the [`AddExpense`](#addexpense) dialog rather than navigating anywhere.

The band's right-hand status reads `<month> · closed` or `<month> · in progress`
from the `isClosed` prop the page derives, never from a literal. It said
"closed" unconditionally once, which claimed a month was final on its third
day.

### Fill mode

`VerticalPie`, `SpendLine`, `SubtypeBars`, `Treemap` and `Ledger` take a `fill`
prop that swaps their fixed height for one that grows into the cell they were
dealt. Without it a module sizes itself and the board stops being a grid. The
calendar has none — `aspect-square` cells derive height from width — so it gets
a scroll box instead.

`fill` also changes what a module can afford to draw, not only how tall it is.
`VerticalPie`'s legend drops its index and percentage columns in `fill`, because
a `lg:col-span-4` tile leaves the row about 200px and the fixed columns were
squeezing the vertical's name to nothing. Below `lg` every filling module takes
a `max-lg:min-h-*` floor: the board is a single auto-height column there, so
`flex-1` has nothing to resolve against and would collapse the module to its
padding.

### LoginForm

Uses React 19's `useActionState`, which returns `[state, action, pending]` — a
three-tuple, unlike React 18's `useFormState`. The `pending` value disables the
submit button and swaps its label while the action is in flight.

Accessibility details worth preserving: the error message carries `role="alert"`
so it is announced when it appears, and the password field points at it with
`aria-describedby` only when an error is actually present. The form sets
`noValidate` so validation messaging stays consistent with the server's, rather
than the browser showing its own first.

### AddExpense

The masthead's Add expense button and the dialog it opens — a native
`<dialog>` via `showModal()`, the design system's one sanctioned overlay
(see its §7 "Overlays" for why). Focus trapping, `Esc` and the backdrop are
the platform's; the panel is the standard card; the form inside carries the
same `useActionState` three-tuple and the same field, error and button
treatment as the login form.

On success the action returns `saved` instead of redirecting: it has already
called `revalidatePath("/")`, so the same response carries a freshly rendered
board, and the dialog closes over it — for a current-month row, the new row
standing in the ledger is the receipt (a backfilled prior-month row shows up
in the against-last-month figures instead), so the dialog needs no "saved"
state of its own.

Five decisions worth knowing before touching it:

- **React 19 resets uncontrolled fields when a form action resolves.** The
  action therefore echoes the submitted strings back in `state.values`, and
  every `defaultValue` reads from it — remove that echo and a failed submit
  wipes the reader's typing along with showing the error. The error state also
  carries `field`, so `aria-describedby` points at the one field the message
  names rather than being sprayed across all four.
- **Each open is a fresh attempt.** The dialog body is keyed on an opening
  counter, so dismissing a failed half-filled form abandons it — reopening
  does not resurrect a stale error over stale values. The error block is also
  keyed per submit, so the same message twice is still a new `role="alert"`
  node and gets announced both times.
- **The dialog cannot close while a submit is in flight.** `Esc` is blocked in
  `onCancel` and Cancel is disabled while `pending` — a dialog that closes
  mid-action would swallow the action's answer, and a failure nobody saw
  reads as a success.
- **The picker is one grouped `<select>`** — ten `<optgroup>`s in
  `VERTICAL_ORDER`, options in `SUBTYPES` order, value `subtypeKey`
  (`"Food/Swiggy"`). The (vertical, name) pair stays atomic in a single
  control with zero extra state, and the optgroup label carries the vertical
  so option text stays the bare name. The server splits on the *first* slash.
- **Native chrome is left native.** The select's chevron and popup and the
  date input's picker are UA-drawn; they follow the `color-scheme` each theme
  declares, and that is the extent of styling them. `appearance-none` would
  cost the chevron or require a raw hex — a palette bug — to draw it back.

The amount field is `type="text"` with `inputMode="decimal"` per
[money.md](money.md), never `type="number"`. The date input submits
`"YYYY-MM-DD"` by spec whatever the display locale; it defaults to today in
IST, computed at open time (each open remounts the dialog body, so a board
left up overnight still defaults to the right day), and carries
`max={today}` mirroring the action's no-future-days rule — an expense dated
tomorrow would have the calendar, the KPI strip and the spend line disagreeing
about the same rupees. Opening the dialog needs JavaScript — the one
exception to the forms-work-without-JS preference below, and the price of an
overlay; the action itself still validates everything server-side.

## Conventions

- Prefer Server Components. Reach for `"use client"` only when something needs
  browser state or event handlers — in practice that is the theme toggle, the
  charts (Chart.js needs a canvas), the tab shell and the two forms.
- Prefer forms posting to server actions over click handlers, so behaviour
  survives without JavaScript.
- Style with Tailwind utilities inline. Where a class list is long and shared —
  as with the login form's fields — lift it into a named constant in the same
  file rather than inventing a component.
