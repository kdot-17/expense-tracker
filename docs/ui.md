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
| `Masthead` / `Colophon` | `src/components/dashboard/masthead.tsx` | Server |
| `ThemeToggle` | `src/components/theme-toggle.tsx` | Client |
| `VerticalPie` / `SpendLine` / `SubtypeBars` | `src/components/dashboard/charts.tsx` | Client |
| `Treemap` | `src/components/dashboard/treemap.tsx` | Server |
| `CalendarBlock` | `src/components/dashboard/calendar.tsx` | Server |
| `VersusPrevious` | `src/components/dashboard/versus-previous.tsx` | Server |
| `Ledger` | `src/components/dashboard/ledger.tsx` | Server |
| `EmptyPlot` | `src/components/dashboard/empty.tsx` | Server |
| `LoginForm` | `src/app/login/login-form.tsx` | Client |

Only the three that need a canvas or browser state are Client Components. The
treemap looks interactive and is not — it is percentage-positioned divs, so it
renders on the server and costs nothing on the client.

### RootLayout

Sets the page title and description, applies the font variables, injects the
pre-paint theme bootstrap script, and makes the body a full-height flex column
so pages can grow into the available space.

### Masthead

The app chrome and the poster's masthead are the same object — a separate navbar
above a design that already opens with a full-bleed dark band would be two
headers stacked, so the theme toggle and sign-out live inside the band. Sign-out
is a plain `<form>` posting to the `logout` server action: it needs no
`"use client"` and works if the client bundle never loads.

The band's right-hand status reads `<month> · closed` or `<month> · in progress`
from `PERIOD_IS_CLOSED`, never from a literal. It said "closed" unconditionally
once, which claimed a month was final on its third day.

### SectionHead

Each numbered section is introduced by an index and a title, and nothing else.
The explanatory paragraph that used to sit under every heading is gone: it
restated what the chart already showed, and the charts carry their own labels.
`SectionHead` takes no prose prop, so one cannot be added back by accident.

### LoginForm

Uses React 19's `useActionState`, which returns `[state, action, pending]` — a
three-tuple, unlike React 18's `useFormState`. The `pending` value disables the
submit button and swaps its label while the action is in flight.

Accessibility details worth preserving: the error message carries `role="alert"`
so it is announced when it appears, and the password field points at it with
`aria-describedby` only when an error is actually present. The form sets
`noValidate` so validation messaging stays consistent with the server's, rather
than the browser showing its own first.

## Conventions

- Prefer Server Components. Reach for `"use client"` only when something needs
  browser state or event handlers — in practice that is the theme toggle, the
  charts (Chart.js needs a canvas) and the login form.
- Prefer forms posting to server actions over click handlers, so behaviour
  survives without JavaScript.
- Style with Tailwind utilities inline. Where a class list is long and shared —
  as with the login form's fields — lift it into a named constant in the same
  file rather than inventing a component.
