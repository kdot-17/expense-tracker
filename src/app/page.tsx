import { Dashboard } from "@/components/dashboard/dashboard";
import { Masthead } from "@/components/dashboard/masthead";
import { verifySession } from "@/lib/dal";
import { getMonthData } from "@/lib/expenses-data";
import { currentPeriod } from "@/lib/period";

export default async function Home() {
  // Redirects to /login if the session cookie is missing, expired, or forged.
  await verifySession();

  // One fetch per render, threaded down as props — no module below this one
  // touches the database, and the client components only ever receive computed
  // plain values. The route is dynamic (the session read above sees to that),
  // so this query runs per request and never at build.
  const period = currentPeriod();
  const data = await getMonthData(period);

  return (
    // `lg:flex-none` alongside `lg:h-dvh` is not redundant. `flex-1` sets
    // `flex-basis: 0%`, and in a column flex container the basis is the main
    // axis — it wins over `height`, so the board grew to its content height and
    // `overflow-hidden` had nothing to clip. Below `lg` the board stacks and
    // the page scrolls normally; a no-scroll phone dashboard would be seven
    // unreadable slivers.
    <div className="flex min-h-0 flex-1 flex-col lg:h-dvh lg:flex-none lg:overflow-hidden">
      <Masthead monthLabel={period.label} isClosed={period.isClosed} />
      <Dashboard period={period} data={data} />
    </div>
  );
}
