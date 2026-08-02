import { verifySession } from "@/lib/dal";

import { Navbar } from "./navbar";

export default async function Home() {
  // Redirects to /login if the session cookie is missing, expired, or forged.
  await verifySession();

  return (
    <>
      <Navbar />
      <main className="flex-1" />
    </>
  );
}
