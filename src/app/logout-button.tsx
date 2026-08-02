import { logout } from "./login/actions";

/**
 * A plain form posting to a Server Action, so signing out still works if the
 * client bundle hasn't loaded. No "use client" needed.
 */
export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
      >
        Sign out
      </button>
    </form>
  );
}
