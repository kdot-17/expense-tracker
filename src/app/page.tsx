import { verifySession } from "@/lib/dal";

import { LogoutButton } from "./logout-button";

export default async function Home() {
  // Redirects to /login if the session cookie is missing, expired, or forged.
  await verifySession();

  return (
    <>
      <header className="flex justify-end p-4">
        <LogoutButton />
      </header>
      <main className="flex-1" />
    </>
  );
}
