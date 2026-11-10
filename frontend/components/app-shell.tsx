"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/navbar";
import { Header } from "@/components/header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/landing";

  if (isLanding) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col w-full selection:bg-secondary selection:text-secondary-foreground font-sans">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen antialiased flex selection:bg-secondary selection:text-secondary-foreground w-full">
      <Sidebar />
      <div className="flex-1 overflow-y-auto min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
