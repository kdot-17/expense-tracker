import { Dashboard } from "@/components/dashboard/dashboard";
import { Masthead } from "@/components/dashboard/masthead";
import { verifySession } from "@/lib/dal";

export default async function Home() {
  // Redirects to /login if the session cookie is missing, expired, or forged.
  await verifySession();

  return (
    // `lg:flex-none` alongside `lg:h-dvh` is not redundant. `flex-1` sets
    // `flex-basis: 0%`, and in a column flex container the basis is the main
    // axis — it wins over `height`, so the board grew to its content height and
    // `overflow-hidden` had nothing to clip. Below `lg` the board stacks and
    // the page scrolls normally; a no-scroll phone dashboard would be seven
    // unreadable slivers.
    <div className="flex min-h-0 flex-1 flex-col lg:h-dvh lg:flex-none lg:overflow-hidden">
      <Masthead />
      <Dashboard />
    </div>
  );
}
