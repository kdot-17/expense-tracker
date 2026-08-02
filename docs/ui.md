# UI and styling

## Styling

Tailwind CSS 4, wired in through PostCSS. There is no `tailwind.config.js` —
version 4 configures itself from CSS. `src/app/globals.css` is the whole setup:

```css
@import "tailwindcss";
```

Theme tokens are declared in an `@theme inline` block, which turns them into
Tailwind utilities. `--color-background` and `--color-foreground` become
`bg-background` and `text-foreground`, and the font variables become the default
sans and mono families.

## Dark mode

Dark mode follows the operating system through `prefers-color-scheme`. There is
no toggle and no class-based switching — the two custom properties
`--background` and `--foreground` are redefined inside the media query, and
everything built on those tokens changes automatically.

Components that need their own dark treatment use Tailwind's `dark:` variants
directly, as the form fields and buttons do for their borders and hover states.

## Fonts

Geist and Geist Mono, loaded through `next/font/google` in the root layout and
exposed as `--font-geist-sans` and `--font-geist-mono`. Loading them this way
means they are self-hosted at build time, so there is no request to Google's
servers at runtime and no layout shift from a late-arriving font.

## Components

| Component | File | Kind |
| --- | --- | --- |
| `RootLayout` | `src/app/layout.tsx` | Server |
| `Navbar` | `src/app/navbar.tsx` | Server |
| `LogoutButton` | `src/app/logout-button.tsx` | Server |
| `LoginForm` | `src/app/login/login-form.tsx` | Client |

### RootLayout

Sets the page title and description, applies the font variables, and makes the
body a full-height flex column so pages can grow into the available space.

### Navbar

The app heading and a sign-out button. It sits in the page rather than the root
layout on purpose: the root layout also wraps `/login`, which should not show app
chrome. Once there is more than one signed-in route, it should move into a shared
layout for those routes.

### LogoutButton

A plain `<form>` posting to the `logout` server action. It needs no `"use
client"` and no JavaScript — signing out still works if the client bundle never
loads.

### LoginForm

The only client component. It uses React 19's `useActionState`, which returns
`[state, action, pending]` — a three-tuple, unlike React 18's `useFormState`. The
`pending` value disables the submit button and swaps its label while the action
is in flight.

Accessibility details worth preserving: the error message carries `role="alert"`
so it is announced when it appears, and the password field points at it with
`aria-describedby` only when an error is actually present. The form sets
`noValidate` so validation messaging stays consistent with the server's, rather
than the browser showing its own first.

## Conventions

- Prefer Server Components. Reach for `"use client"` only when something needs
  browser state or event handlers.
- Prefer forms posting to server actions over click handlers, so behaviour
  survives without JavaScript.
- Style with Tailwind utilities inline. Where a class list is long and shared —
  as with the login form's fields — lift it into a named constant in the same
  file rather than inventing a component.
