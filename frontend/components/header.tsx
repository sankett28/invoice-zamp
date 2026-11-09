"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MagnifyingGlass, Bell } from "@phosphor-icons/react";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/invoices?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  // Compute breadcrumbs from path
  let breadcrumbContent = <span>Overview</span>;
  if (pathname.startsWith("/runs/")) {
    const runId = pathname.split("/")[2];
    breadcrumbContent = (
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <Link href="/invoices" className="text-muted-foreground hover:text-foreground transition">
          Invoices
        </Link>
        <span className="text-muted-foreground/60">/</span>
        <span className="text-foreground font-semibold">{runId.slice(0, 8)}...</span>
      </div>
    );
  } else if (pathname === "/invoices") {
    breadcrumbContent = <span className="font-semibold text-foreground">Invoices</span>;
  } else if (pathname === "/upload") {
    breadcrumbContent = <span className="font-semibold text-foreground">Upload Invoice</span>;
  } else if (pathname === "/vendors") {
    breadcrumbContent = <span className="font-semibold text-foreground">Vendors &amp; POs</span>;
  }

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30 px-6 lg:px-12 flex items-center justify-between shrink-0">
      {/* Breadcrumb Left */}
      <div className="text-sm font-semibold text-foreground">
        {breadcrumbContent}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Search bar matching Figma */}
        <form onSubmit={handleSearchSubmit} className="relative hidden sm:block">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-background text-xs w-64 md:w-80 shadow-2xs focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition">
            <MagnifyingGlass size={15} weight="bold" className="text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search invoices, vendors, POs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-0 outline-hidden text-xs text-foreground placeholder:text-muted-foreground"
            />
            
          </div>
        </form>

        {/* Notification Bell */}
        <button
          type="button"
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
          title="Notifications"
        >
          <Bell size={18} weight="regular" />
        </button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Avatar SP from Figma */}
        <div
          className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0 cursor-pointer"
          title="Sanket Pimprikar"
        >
          SP
        </div>
      </div>
    </header>
  );
}
