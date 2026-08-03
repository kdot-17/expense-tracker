import { logout } from "@/app/login/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { MONTH_LABEL } from "@/lib/transactions";

const MICRO = "text-[10px] font-semibold uppercase tracking-[0.2em]";

/**
 * The app chrome and the poster's masthead are the same object. A separate
 * navbar above a design that already opens with a full-bleed black band would
 * be two headers stacked, so the account controls live inside the band.
 */
export function Masthead() {
  return (
    <header className="bg-bar text-on-bar w-full">
      <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-6 lg:px-10">
        <span className={MICRO}>Expense tracker — monthly review</span>
        <span className={`${MICRO} hidden sm:inline`}>{MONTH_LABEL} · closed</span>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {/* A plain form posting to a Server Action, so signing out still
              works if the client bundle never loads. */}
          <form action={logout}>
            <button
              type="submit"
              className={`${MICRO} border-on-bar hover:bg-on-bar hover:text-bar border-2 px-2.5 py-1`}
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function Colophon() {
  return (
    <footer className="bg-bar text-on-bar w-full">
      <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-10">
        <span className={MICRO}>Sample data · not wired to an account</span>
        <span className={MICRO}>All figures in INR</span>
        <span className={`${MICRO} hidden lg:inline`}>
          Anton / Inter · 6 categorical hexes, frozen
        </span>
      </div>
    </footer>
  );
}
