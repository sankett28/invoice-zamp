import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Sidebar } from "@/components/navbar";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "LedgerFlow — Accounts Payable Invoice Automation",
  description: "Autonomous Accounts Payable pipeline & deterministic decision engine for Zamp PS-1.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fustat:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('ledgerflow-theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (theme === 'dark' || (!theme && prefersDark)) {
                  document.documentElement.classList.add('dark');
                } else if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="bg-background text-foreground min-h-screen antialiased flex selection:bg-secondary selection:text-secondary-foreground">
        <Suspense
          fallback={
            <aside className="w-64 border-r border-border bg-sidebar min-h-screen" />
          }
        >
          <Sidebar />
        </Suspense>
        <div className="flex-1 overflow-y-auto min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1 p-6 lg:p-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
