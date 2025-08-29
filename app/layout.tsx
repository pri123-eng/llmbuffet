import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import AuthStatus from "./components/AuthStatus";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LLM Buffet",
  description: "Compare AI models side-by-side",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="sticky top-0 z-10 bg-black/70 backdrop-blur border-b border-white/10 text-slate-100">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-emerald-400 via-cyan-400 to-indigo-400" />
              <span className="text-sm font-semibold tracking-tight">LLM Buffet</span>
            </div>
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/login" className="rounded-lg px-3 py-1.5 border border-white/15 bg-white/5 hover:bg-white/10">Login</Link>
              <Link href="/signup" className="rounded-lg px-3 py-1.5 border border-white/15 bg-gradient-to-br from-cyan-400 to-indigo-500 text-black font-medium hover:brightness-110">Sign up</Link>
              <AuthStatus />
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
