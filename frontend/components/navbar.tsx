"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  FileText,
  UploadSimple,
  Buildings,
  Compass,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: SquaresFour },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/upload", label: "Upload invoice", icon: UploadSimple },
  { href: "/vendors", label: "Vendors & POs", icon: Buildings },
  { href: "/landing", label: "Case File · PS-1", icon: Compass, badge: "Zamp" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 border-r border-border bg-sidebar min-h-screen flex flex-col shrink-0 transition-colors">
      {/* Brand Header */}
      <div className="h-16 border-b border-border flex items-center px-5 gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-base shadow-2xs">
          L
        </div>
        <span className="font-semibold text-foreground text-base tracking-tight">
          LedgerFlow
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer group",
                isActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  size={18}
                  weight={isActive ? "fill" : "regular"}
                  className={cn("transition-colors shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-secondary/30 text-secondary-foreground border border-secondary/40 shrink-0">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Engine Status Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium px-1">
          <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
          <span className="truncate">Engine online · PS-1 spec v1</span>
        </div>
      </div>
    </aside>
  );
}
