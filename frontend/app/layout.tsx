import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Sidebar } from "@/components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LedgerFlow — Accounts Payable Invoice Automation",
  description: "AI extraction and deterministic financial decision engine for Zamp PS-1.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen antialiased flex`}>
        <Suspense fallback={<aside className="w-64 border-r border-slate-200 bg-white min-h-screen" />}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 overflow-y-auto min-h-screen flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
