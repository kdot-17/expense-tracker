"use server";

import { redirect } from "next/navigation";

import { credentialsAreValid } from "@/lib/auth";
import { createSession, deleteSession } from "@/lib/session";

export type LoginState = { error?: string };

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter both your email and password." };
  }

  // One message for both failure modes so it can't be used to probe which
  // half was wrong.
  if (!credentialsAreValid(email, password)) {
    return { error: "That email and password don't match." };
  }

  await createSession(email);

  // Must stay outside any try/catch — redirect() signals by throwing, and a
  // catch block would swallow the navigation.
  redirect("/");
}

export async function logout(): Promise<void> {
  // No session check needed: this only clears the caller's own cookie, so the
  // worst a stray POST can do is sign out someone who is already signed out.
  await deleteSession();
  redirect("/login");
}
