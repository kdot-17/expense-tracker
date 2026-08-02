import { verifySession } from "@/lib/dal";

export default async function Home() {
  // Redirects to /login if the session cookie is missing, expired, or forged.
  await verifySession();

  return <main className="flex-1" />;
}
