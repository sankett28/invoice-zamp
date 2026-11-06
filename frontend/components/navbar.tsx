"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Upload,
  Building2,
  FileCheck2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/upload", label: "Upload Invoice", icon: Upload, highlight: true },
  { href: "/vendors", label: "Vendors & POs", icon: Building2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-200 bg-white min-h-screen flex flex-col shrink-0">
      {/* Brand Header */}
      <div className="h-16 border-b border-slate-100 flex items-center px-6 gap-3">
        <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm">
          <FileCheck2 className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-slate-900 text-base tracking-tight">LedgerFlow</span>
          <span className="block text-[10px] text-slate-500 font-medium tracking-wide uppercase">
            AP Automation
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-4 space-y-1.5 flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          if (item.highlight) {
            return (
              <div key={item.href} className="pt-2 pb-2">
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition shadow-sm"
                >
                  <Icon className="w-4 h-4 text-emerald-400" />
                  <span>{item.label}</span>
                </Link>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium transition",
                isActive
                  ? "bg-slate-100 text-slate-900 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-slate-900" : "text-slate-400")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
        <div className="flex items-center justify-between">
          <span>Engine Status</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Operational
          </span>
        </div>
        <p className="text-[11px] text-slate-400">Zamp PS-1 Specification</p>
      </div>
    </aside>
  );
}
