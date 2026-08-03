import { logout } from "@/app/login/actions";
import { AddExpense } from "@/components/dashboard/add-expense";
import { ThemeToggle } from "@/components/theme-toggle";
import { todayInIST } from "@/lib/period";

const MICRO = "text-micro font-semibold uppercase tracking-[0.2em]";

/**
 * The app chrome and the poster's masthead are the same object. A separate
 * navbar above a design that already opens with a full-bleed black band would
 * be two headers stacked, so the account controls live inside the band.
 *
 * The month and its status arrive as props — the page computed the period
 * once, and this band must agree with the KPI strip about what month it is.
 */
export function Masthead({
  monthLabel,
  isClosed,
}: {
  monthLabel: string;
  isClosed: boolean;
}) {
  return (
    // `shrink-0`: the board below is a fixed-height flex column at `lg`, and a
    // shrinkable band would give up its own height to the grid before the grid
    // gave up any of its own.
    <header className="bg-bar text-on-bar w-full shrink-0">
      <div className="mx-auto flex w-full max-w-[85rem] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-6 lg:px-10">
        <span className={MICRO}>Expense tracker — monthly review</span>
        <span className={`${MICRO} hidden sm:inline`}>{monthLabel} · {isClosed ? "closed" : "in progress"}</span>

        <div className="flex items-center gap-3">
          {/* First in the group: the one control that creates data leads, and
              the chrome controls trail. It opens the add-expense dialog —
              labelled in words, not "+": see the theme toggle's own note on
              ambiguous glyphs. */}
          <AddExpense today={todayInIST()} />
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
