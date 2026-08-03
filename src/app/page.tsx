import { Dashboard } from "@/components/dashboard/dashboard";
import { Colophon, Masthead } from "@/components/dashboard/masthead";
import { verifySession } from "@/lib/dal";

export default async function Home() {
  // Redirects to /login if the session cookie is missing, expired, or forged.
  await verifySession();

  return (
    <>
      <Masthead />
      <Dashboard />
      <Colophon />
    </>
  );
}
