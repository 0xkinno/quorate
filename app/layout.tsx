import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Mark } from "@/components/Mark";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quorate: nobody fronts the money",
  description: "Each family's PayPal holds their child's share of a class trip. Nobody is charged until enough children are going, and everyone pays less with each child who joins.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f2f0eb" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=sentient@500,600&f[]=switzer@400,500,600&display=swap" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap" />
      </head>
      <body>
        <header className="sticky top-3 z-50 mx-auto max-w-6xl px-4">
          <nav aria-label="Main" className="nav flex items-center justify-between px-4 py-2.5">
            <Link href="/" className="flex items-center gap-2">
              <Mark size={26} />
              <span className="display text-lg">Quorate</span>
            </Link>
            <div className="flex items-center gap-1 text-sm sm:gap-2">
              <Link href="/register" className="rounded-md px-2.5 py-1.5 hover:bg-white/70">The Register</Link>
              <Link href="/help" className="hidden rounded-md px-2.5 py-1.5 hover:bg-white/70 sm:inline">Help desk</Link>
              <Link href="/judge" className="rounded-md bg-[var(--held)] px-3 py-1.5 text-white shadow-[var(--glow)]">For judges</Link>
            </div>
          </nav>
        </header>
        {children}
        <footer className="mx-auto mt-24 max-w-6xl border-t rule px-4 py-10 text-sm text-[var(--ink-2)]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row">
            <p>Runs on the PayPal sandbox. No real money moves. People and the school shown are demo.</p>
            <div className="flex gap-4">
              <a href="https://github.com/0xkinno/quorate" className="underline">Source</a>
              <Link href="/judge" className="underline">Judge door</Link>
              <Link href="/api/status" className="underline">Status</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
