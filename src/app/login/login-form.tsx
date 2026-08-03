"use client";

import { useActionState } from "react";

import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

/** Square, heavy-ruled, no radius — the same field the rest of the app uses. */
const fieldClasses =
  "border-rule bg-card text-ink w-full border-2 px-3 py-2 text-sm outline-none";

export function LoginForm() {
  // React 19: returns [state, action, pending] and the action receives
  // (prevState, formData) — not the React 18 useFormState two-tuple.
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-[10px] font-semibold tracking-[0.2em] uppercase"
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
          className="text-[10px] font-semibold tracking-[0.2em] uppercase"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={fieldClasses}
          aria-describedby={state.error ? "login-error" : undefined}
        />
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
        className="bg-rule text-page mt-1 px-3 py-2.5 text-[11px] font-semibold tracking-[0.2em] uppercase disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
