import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crown Billiard",
  description: "Thu ngân",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-50`}
      >
        <div className="min-h-dvh">
          <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/75 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-zinc-950 text-sm font-semibold text-white">
                  POS
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold">Crown Billiard</div>
                  <div className="text-xs text-zinc-300">Thu ngân</div>
                </div>
              </div>

              <nav className="flex items-center gap-1 text-sm">
                <Link
                  href="/"
                  className="rounded-lg px-3 py-2 text-zinc-200 hover:bg-white/10 hover:text-white"
                >
                  Quản lý bàn
                </Link>
                <Link
                  href="/orders"
                  className="rounded-lg px-3 py-2 text-zinc-200 hover:bg-white/10 hover:text-white"
                >
                  Lịch sử
                </Link>
                <Link
                  href="/settings"
                  className="rounded-lg px-3 py-2 text-zinc-200 hover:bg-white/10 hover:text-white"
                >
                  Cài đặt
                </Link>
              </nav>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl px-4 py-5">
            <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(255,255,255,0.08),rgba(0,0,0,0)_60%)]" />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
