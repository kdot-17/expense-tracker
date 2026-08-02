import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · Expense Tracker",
};

export default async function LoginPage() {
  // proxy.ts already bounces signed-in users away from /login; this repeats the
  // check so the page is still correct if the matcher ever changes.
  if (await getSession()) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Expense Tracker</h1>
        <p className="mt-1 mb-8 text-sm text-black/60 dark:text-white/60">
          Sign in to continue.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
