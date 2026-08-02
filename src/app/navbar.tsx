import { LogoutButton } from "./logout-button";

/**
 * Lives in the page rather than the root layout on purpose: the root layout
 * also wraps /login, which should not show app chrome. Move it to a shared
 * layout once there is more than one signed-in route.
 */
export function Navbar() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-black/10 px-4 py-3 dark:border-white/10">
      <h1 className="text-base font-semibold tracking-tight">Expense Tracker</h1>
      <LogoutButton />
    </header>
  );
}
