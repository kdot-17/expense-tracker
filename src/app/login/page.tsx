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
      <div className="border-rule bg-card w-full max-w-sm border-2 p-6 sm:p-8">
        <h1 className="font-display text-[clamp(2rem,7vw,3rem)] leading-[0.85] uppercase">
          Expense
          <br />
          Tracker
        </h1>
        <p className="text-muted mt-3 mb-8 text-micro font-semibold tracking-[0.2em] uppercase">
          Sign in to continue
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
