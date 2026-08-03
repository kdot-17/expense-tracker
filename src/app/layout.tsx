import type { Metadata, Viewport } from "next";

import { body, display } from "@/lib/fonts";
import { THEME_BOOTSTRAP } from "@/lib/theme";

import "./globals.css";

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Where the money went — a monthly review of one account.",
};

export const viewport: Viewport = {
  // Both themes are real, so let the browser paint its own chrome to match
  // whichever one is active rather than assuming light.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3ed" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
      // The bootstrap script writes `data-theme` here before React hydrates, so
      // the server HTML and the client's first read can legitimately differ.
      suppressHydrationWarning
    >
      <head>
        {/* Blocking and inline, on purpose: it has to resolve the stored theme
            before the first paint, or the page flashes the wrong one. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="bg-page text-ink flex min-h-full flex-col">{children}</body>
    </html>
  );
}
