"use client";

import { useActionState, useState } from "react";

import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

/** Square, heavy-ruled, no radius — the same field the rest of the app uses. */
const fieldClasses =
  "border-rule bg-card text-ink w-full border-2 px-3 py-2 text-sm outline-none";

/**
 * The reveal control's eye, drawn rather than imported.
 *
 * It is the first icon in the app, so it is built to the same three rules
 * everything else keeps: flat, square-cut, no radius and no shadow, at the 2px
 * stroke the rules elsewhere use. `currentColor` is what makes it a token — it
 * inherits the button's ink and so follows the theme with no second value to
 * keep in sync, which is the failure mode `npm run palette` exists to catch.
 *
 * `aria-hidden` because the button already carries the accessible name. An
 * icon labelled twice is read twice.
 */
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3.25" />
      {/* The struck-through state says "hidden" without relying on the eye
          shape alone, which at 20px is nearly the same silhouette either way. */}
      {off ? <path d="M4 20 20 4" /> : null}
    </svg>
  );
}

export function LoginForm() {
  // React 19: returns [state, action, pending] and the action receives
  // (prevState, formData) — not the React 18 useFormState two-tuple.
  const [state, formAction, pending] = useActionState(login, initialState);
  // Always starts hidden. A field that remembered being revealed would show the
  // password to whoever opened the page next.
  const [revealed, setRevealed] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-micro font-semibold tracking-[0.2em] uppercase"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          className={fieldClasses}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-micro font-semibold tracking-[0.2em] uppercase"
        >
          Password
        </label>
        {/* The field and its control are one object, so they share a rule
            rather than sitting in a box each: `-ml-0.5` pulls the button onto
            the input's border, because two adjacent 2px edges paint 4px and the
            seam would read heavier than the frame around it. */}
        <div className="flex">
          <input
            id="password"
            name="password"
            type={revealed ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${fieldClasses} min-w-0 flex-1`}
            aria-describedby={state.error ? "login-error" : undefined}
          />
          <button
            type="button"
            // Not a submit button. Without this it would submit the form on
            // click, since a bare <button> inside a form defaults to submit.
            onClick={() => setRevealed((shown) => !shown)}
            aria-pressed={revealed}
            aria-controls="password"
            // The name states the action, and `aria-pressed` carries the state,
            // so a screen reader hears both without the label changing under it
            // mid-interaction.
            aria-label="Show password"
            className="border-rule text-ink bg-card hover:bg-rule hover:text-page -ml-0.5 flex shrink-0 items-center justify-center border-2 px-3 focus-visible:relative focus-visible:z-10"
          >
            <EyeIcon off={!revealed} />
          </button>
        </div>
      </div>

      {state.error ? (
        <p
          id="login-error"
          role="alert"
          // Slot 0 is the identity red; the message also says what is wrong, so
          // colour is never the only carrier.
          className="border-2 px-3 py-2 text-sm font-medium"
          style={{
            borderColor: "var(--slot-0)",
            background: "var(--slot-0)",
            color: "var(--on-0)",
          }}
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="bg-rule text-page mt-1 px-3 py-2.5 text-tick font-semibold tracking-[0.2em] uppercase disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
