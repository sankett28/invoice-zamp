"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  SquaresFour,
  ListDashes,
  UploadSimple,
  ArrowsClockwise,
  CheckCircle,
  Warning,
  Prohibit,
  FileCsv,
  Buildings,
  ArrowUpRight,
  ArrowRight,
  Lightning,
  Clock,
  ChartBar,
  MagnifyingGlass,
  Sparkle,
  ShieldCheck,
} from "@phosphor-icons/react";
import { api, RunSummary, Vendor, PurchaseOrder } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function OverviewPage() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"bento" | "list">("bento");
  const [bentoSearch, setBentoSearch] = useState<string>("");
  const [attentionFilter, setAttentionFilter] = useState<"ALL" | "REVIEW" | "BLOCKED">("ALL");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [runsData, vendorsData, posData] = await Promise.all([
        api.listRuns(undefined, 50, 0).catch(() => []),
        api.listVendors().catch(() => []),
        api.listPurchaseOrders().catch(() => []),
      ]);
      setRuns(runsData);
      setVendors(vendorsData);
      setPOs(posData);
    } catch (e) {
      console.error("Failed to fetch dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real Counts directly from database
  const totalCount = runs.length;
  const readyCount = runs.filter((r) => r.decision_status === "READY_FOR_AP_APPROVAL").length;
  const reviewCount = runs.filter((r) => r.decision_status === "REVIEW_REQUIRED").length;
  const blockedCount = runs.filter((r) => r.decision_status === "BLOCKED").length;

  const attentionRuns = runs.filter(
    (r) => r.decision_status === "REVIEW_REQUIRED" || r.decision_status === "BLOCKED"
  );

  const filteredAttention = attentionRuns.filter((r) => {
    if (attentionFilter === "REVIEW" && r.decision_status !== "REVIEW_REQUIRED") return false;
    if (attentionFilter === "BLOCKED" && r.decision_status !== "BLOCKED") return false;

    if (!bentoSearch.trim()) return true;
    const q = bentoSearch.toLowerCase();
    return (
      (r.invoice_number || "").toLowerCase().includes(q) ||
      (r.original_filename || "").toLowerCase().includes(q) ||
      (r.vendor?.legal_name || "").toLowerCase().includes(q) ||
      (r.purchase_order?.po_number || "").toLowerCase().includes(q)
    );
  });

  // Real Calculated financial metrics directly from database
  const totalQueueValue = runs.reduce((acc, r) => acc + (parseFloat(r.grand_total || "0") || 0), 0);
  const readyValue = runs
    .filter((r) => r.decision_status === "READY_FOR_AP_APPROVAL")
    .reduce((acc, r) => acc + (parseFloat(r.grand_total || "0") || 0), 0);
  const reviewValue = runs
    .filter((r) => r.decision_status === "REVIEW_REQUIRED")
    .reduce((acc, r) => acc + (parseFloat(r.grand_total || "0") || 0), 0);
  const blockedValue = runs
    .filter((r) => r.decision_status === "BLOCKED")
    .reduce((acc, r) => acc + (parseFloat(r.grand_total || "0") || 0), 0);

  // Recent activity events from real runs
  const recentRuns = [...runs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  // Top vendor from real directory
  const topVendor = vendors.length > 0 ? vendors[0] : null;

  return (
    <div className="space-y-8 max-w-7xl w-full mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.12]">
            Overview
          </h1>
          <p className="text-foreground/70 text-sm sm:text-base mt-1.5 leading-relaxed">
            AP automation engine across all connected vendors. {reviewCount + blockedCount} invoices requiring attention.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Toggle: Bento Grid vs Full List */}
          <div className="flex items-center p-1 rounded-xl bg-card border border-border shadow-2xs">
            <button
              onClick={() => setViewMode("bento")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === "bento"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <SquaresFour size={14} weight="bold" />
              <span>Bento Grid</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListDashes size={14} weight="bold" />
              <span>List View</span>
            </button>
          </div>

          {/* Export CSV button */}
          <a
            href={api.getExportUrl("csv")}
            download="ledgerflow_ap_export.csv"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted font-semibold text-xs transition shadow-xs cursor-pointer"
          >
            <FileCsv size={16} weight="bold" className="text-primary" />
            <span>Export CSV</span>
          </a>

          {/* Upload Invoice CTA */}
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition shadow-xs cursor-pointer"
          >
            <UploadSimple size={15} weight="bold" />
            <span>Upload invoice</span>
          </Link>

          {/* Refresh */}
          <button
            onClick={fetchData}
            className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition shadow-xs cursor-pointer"
            title="Refresh database records"
          >
            <ArrowsClockwise size={16} weight="bold" className={loading ? "animate-spin text-primary" : ""} />
          </button>
        </div>
      </div>

      {/* Kashew Stat Band with 100% Real Database Metrics */}
      <div className="rounded-3xl bg-primary text-white p-7 sm:p-9 shadow-xs relative overflow-hidden [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:80px_80px]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-white/10 relative z-10">
          {/* TOTAL RUNS */}
          <div className="space-y-1.5 sm:px-4 first:pl-0">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-none tabular-nums">
              {totalCount}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-white/50 pt-1">
              TOTAL RUNS
            </div>
            <div className="text-xs text-white/70">
              {totalCount === 1 ? "1 invoice run in database" : `${totalCount} invoice runs in database`}
            </div>
          </div>

          {/* READY FOR APPROVAL */}
          <div className="space-y-1.5 sm:px-4 pt-4 sm:pt-0">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-none text-secondary tabular-nums">
              {readyCount}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-white/50 pt-1">
              READY FOR APPROVAL
            </div>
            <div className="text-xs text-white/70">
              Passed deterministic rules
            </div>
          </div>

          {/* REVIEW REQUIRED */}
          <div className="space-y-1.5 sm:px-4 pt-4 sm:pt-0">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-none text-white tabular-nums">
              {reviewCount}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-white/50 pt-1">
              REVIEW REQUIRED
            </div>
            <div className="text-xs text-white/70">
              Awaiting human sign-off
            </div>
          </div>

          {/* BLOCKED */}
          <div className="space-y-1.5 sm:px-4 pt-4 sm:pt-0">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-none text-[oklch(0.85_0.15_25)] tabular-nums">
              {blockedCount}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-white/50 pt-1">
              BLOCKED
            </div>
            <div className="text-xs text-white/70">
              Duplicates or policy failures
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Bento Grid View vs Full List View */}
      {viewMode === "bento" ? (
        <div className="space-y-7">
          {/* Top Bento Row: Readiness, Queue Value & Realtime Audit Feed */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Approval Readiness */}
            <div className="md:col-span-4 rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <Lightning size={18} weight="fill" className="text-primary" />
                    <h3 className="text-base font-semibold text-foreground">
                      Approval readiness
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                    REAL ENGINE
                  </span>
                </div>

                <div className="flex items-center gap-5 pt-2">
                  <div className="relative w-20 h-20 rounded-full border-4 border-muted border-t-primary border-r-primary flex flex-col items-center justify-center shrink-0">
                    <span className="text-xl font-extrabold text-foreground tracking-tight leading-none">
                      {totalCount > 0 ? `${Math.round((readyCount / totalCount) * 100)}%` : "0%"}
                    </span>
                    <span className="text-[9px] text-muted-foreground uppercase font-semibold mt-0.5">
                      Ready
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Deterministic Checks
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-foreground">Passed clean</span>
                      <span className="font-mono font-bold text-primary">{readyCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-foreground">Tolerance warnings</span>
                      <span className="font-mono font-bold text-secondary-foreground">{reviewCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-foreground">Critical violations</span>
                      <span className="font-mono font-bold text-destructive">{blockedCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Straight-through rate</span>
                <span className="font-semibold text-primary">
                  {totalCount > 0 ? `${Math.round((readyCount / totalCount) * 100)}% automated` : "No data yet"}
                </span>
              </div>
            </div>

            {/* Value in Queue */}
            <div className="md:col-span-4 rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <ChartBar size={18} weight="bold" className="text-primary" />
                    <h3 className="text-base font-semibold text-foreground">
                      Value in queue
                    </h3>
                  </div>
                  <span className="text-sm font-bold font-mono text-foreground tabular-nums">
                    {formatCurrency(totalQueueValue)}
                  </span>
                </div>

                <div className="space-y-3 pt-1 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="w-16 font-medium text-foreground">Ready</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{
                          width: totalQueueValue > 0 ? `${Math.min(100, (readyValue / totalQueueValue) * 100)}%` : "0%",
                        }}
                      />
                    </div>
                    <span className="w-20 text-right font-mono font-semibold text-primary">
                      {formatCurrency(readyValue)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="w-16 font-medium text-foreground">Review</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-secondary rounded-full transition-all duration-300"
                        style={{
                          width: totalQueueValue > 0 ? `${Math.min(100, (reviewValue / totalQueueValue) * 100)}%` : "0%",
                        }}
                      />
                    </div>
                    <span className="w-20 text-right font-mono font-semibold text-secondary-foreground">
                      {formatCurrency(reviewValue)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="w-16 font-medium text-foreground">Blocked</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-destructive rounded-full transition-all duration-300"
                        style={{
                          width: totalQueueValue > 0 ? `${Math.min(100, (blockedValue / totalQueueValue) * 100)}%` : "0%",
                        }}
                      />
                    </div>
                    <span className="w-20 text-right font-mono font-semibold text-destructive">
                      {formatCurrency(blockedValue)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Working capital active</span>
                <span className="font-semibold text-foreground">
                  {totalQueueValue > 0 ? formatCurrency(totalQueueValue) : "₹0.00 in queue"}
                </span>
              </div>
            </div>

            {/* Realtime Audit Stream from Real Runs */}
            <div className="md:col-span-4 rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={18} weight="bold" className="text-primary" />
                    <h3 className="text-base font-semibold text-foreground">
                      Live audit stream
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Latest Activity
                  </span>
                </div>

                {recentRuns.length > 0 ? (
                  <div className="space-y-2.5 text-xs">
                    {recentRuns.map((r) => {
                      const isReady = r.decision_status === "READY_FOR_AP_APPROVAL";
                      const isBlocked = r.decision_status === "BLOCKED";
                      return (
                        <div key={r.id} className="flex items-start gap-2.5 pb-2 border-b border-border/60 last:border-b-0">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              isReady
                                ? "bg-primary/10 text-primary"
                                : isBlocked
                                ? "bg-destructive/10 text-destructive"
                                : "bg-secondary/30 text-secondary-foreground"
                            }`}
                          >
                            {isReady ? (
                              <CheckCircle size={12} weight="bold" />
                            ) : isBlocked ? (
                              <Prohibit size={12} weight="bold" />
                            ) : (
                              <Lightning size={12} weight="fill" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-foreground truncate">
                              {r.invoice_number ? `Invoice ${r.invoice_number}` : r.original_filename}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {r.vendor?.legal_name || "Unmatched vendor"}
                              {r.grand_total ? ` · ${formatCurrency(r.grand_total)}` : ""}
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatDateTime(r.created_at).split(",")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    No activity events recorded yet. Upload an invoice to stream processing runs.
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Engine Status</span>
                <span className="font-mono font-semibold text-primary">Connected to Database</span>
              </div>
            </div>
          </div>

          {/* Primary Section: "Needs your attention" BENTO GRID */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
            {/* Header with Search and Filter Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-secondary/30 text-secondary-foreground flex items-center justify-center">
                  <Warning size={18} weight="fill" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                      Needs your attention
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-secondary/30 text-secondary-foreground border border-secondary/40">
                      {attentionRuns.length} OPEN
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real database exceptions, line-item price variances, missing POs, and duplicate alerts
                  </p>
                </div>
              </div>

              {/* Controls: Search and Filter Tabs */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Search */}
                <div className="relative min-w-[220px]">
                  <MagnifyingGlass
                    size={14}
                    weight="bold"
                    className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2"
                  />
                  <input
                    type="text"
                    placeholder="Search attention queue..."
                    value={bentoSearch}
                    onChange={(e) => setBentoSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center p-0.5 rounded-xl bg-background border border-border text-xs">
                  <button
                    onClick={() => setAttentionFilter("ALL")}
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      attentionFilter === "ALL"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({attentionRuns.length})
                  </button>
                  <button
                    onClick={() => setAttentionFilter("REVIEW")}
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      attentionFilter === "REVIEW"
                        ? "bg-card text-secondary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Review ({reviewCount})
                  </button>
                  <button
                    onClick={() => setAttentionFilter("BLOCKED")}
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      attentionFilter === "BLOCKED"
                        ? "bg-card text-destructive shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Blocked ({blockedCount})
                  </button>
                </div>

                <Link
                  href="/invoices"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline ml-1"
                >
                  <span>All Invoices</span>
                  <ArrowUpRight size={13} weight="bold" />
                </Link>
              </div>
            </div>

            {/* BENTO GRID OF ATTENTION CARDS */}
            {filteredAttention.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                {filteredAttention.map((r) => {
                  const initials = (r.vendor?.legal_name || r.original_filename || "IN")
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  const isBlocked = r.decision_status === "BLOCKED";

                  // Real contextual reason from backend
                  let reasonTitle = "Review Required";
                  let reasonDesc = r.decision_summary || "Tolerance check or missing sign-off requires confirmation.";
                  if (isBlocked) {
                    reasonTitle = "Blocked by Engine";
                    reasonDesc = r.decision_summary || "Critical violation: Duplicate business key or vendor conflict.";
                  } else if (!r.purchase_order) {
                    reasonTitle = "Missing Purchase Order";
                    reasonDesc = r.decision_summary || "Invoice did not cite a PO; candidate match suggested.";
                  }

                  return (
                    <Link
                      key={r.id}
                      href={`/runs/${r.id}`}
                      className="group p-5 rounded-2xl border border-border bg-background hover:bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 cursor-pointer relative overflow-hidden"
                    >
                      {/* Top strip indicator */}
                      <div
                        className={`absolute top-0 left-0 right-0 h-1 ${
                          isBlocked ? "bg-destructive" : "bg-secondary"
                        }`}
                      />

                      {/* Header: Vendor Initials, Name & Status Badge */}
                      <div className="flex items-start justify-between gap-3 pt-1">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-card border border-border font-bold text-xs text-foreground flex items-center justify-center shrink-0 shadow-2xs group-hover:border-primary/40 group-hover:text-primary transition-colors">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {r.vendor?.legal_name || "Unmatched Vendor"}
                            </h4>
                            <div className="text-xs font-mono text-muted-foreground truncate">
                              {r.invoice_number || (
                                <span className="text-[11px]">{r.original_filename}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Pills */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wide border ${
                              isBlocked
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : "bg-secondary/40 text-secondary-foreground border-secondary/50"
                            }`}
                          >
                            {isBlocked ? "BLOCKED" : "REVIEW"}
                          </span>
                          {!r.purchase_order ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-muted text-muted-foreground border border-border">
                              NO PO
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                              {r.purchase_order.po_number}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reason / Discrepancy Callout Box */}
                      <div className="p-3 rounded-xl bg-card border border-border/80 text-xs space-y-1">
                        <div className="font-semibold text-foreground flex items-center gap-1.5 text-[11px]">
                          {isBlocked ? (
                            <Prohibit size={13} weight="bold" className="text-destructive" />
                          ) : (
                            <Warning size={13} weight="fill" className="text-secondary-foreground" />
                          )}
                          <span>{reasonTitle}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                          {reasonDesc}
                        </p>
                      </div>

                      {/* Footer: Amount & Action Button */}
                      <div className="pt-3 border-t border-border flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Invoice Total
                          </div>
                          <div className="text-base font-bold font-mono text-foreground tabular-nums">
                            {r.grand_total ? formatCurrency(r.grand_total) : "—"}
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground font-semibold text-xs transition-colors shadow-2xs">
                          <span>Review &amp; Decide</span>
                          <ArrowRight size={13} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-background space-y-2">
                <CheckCircle size={32} weight="bold" className="text-primary mx-auto" />
                <h4 className="font-semibold text-sm text-foreground">
                  No invoices currently in this attention filter
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {runs.length === 0
                    ? "No invoices have been ingested into the system yet. Upload an invoice to execute verification."
                    : "All invoices in this filter have been verified or resolved."}
                </p>
                {bentoSearch && (
                  <button
                    onClick={() => setBentoSearch("")}
                    className="text-xs font-semibold text-primary hover:underline mt-2 inline-block cursor-pointer"
                  >
                    Clear search query
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bottom Bento Row: Real Master Vendor Spotlight & Actual Spend Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Real Vendor Spotlight */}
            <div className="md:col-span-5 rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Buildings size={18} weight="bold" className="text-primary" />
                  <h3 className="text-base font-semibold text-foreground">
                    Vendor directory
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-muted text-muted-foreground border border-border">
                  {vendors.length} VENDORS
                </span>
              </div>

              {topVendor ? (
                <>
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background border border-border">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                      {topVendor.legal_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground truncate">{topVendor.legal_name}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-primary/10 text-primary">
                          {topVendor.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
                        Code: {topVendor.vendor_code} · {topVendor.tax_id ? `GSTIN ${topVendor.tax_id}` : "Tax profile on file"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs pt-1 border-t border-border">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pb-1">
                      Active POs in System ({pos.length})
                    </div>
                    {pos.slice(0, 2).map((p) => (
                      <div key={p.id} className="flex justify-between items-center text-[11px]">
                        <span className="font-mono text-foreground">{p.po_number}</span>
                        <span className="text-muted-foreground">
                          {p.remaining_balance ? `${formatCurrency(p.remaining_balance)} left` : formatCurrency(p.po_total)}
                        </span>
                      </div>
                    ))}
                    {pos.length === 0 && (
                      <div className="text-[11px] text-muted-foreground">No purchase orders linked to this vendor yet.</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground space-y-2">
                  <p>No master vendor records registered in the database yet.</p>
                  <Link href="/vendors" className="text-primary font-semibold hover:underline inline-block">
                    Open Vendors &amp; POs Directory →
                  </Link>
                </div>
              )}
            </div>

            {/* Real System Spend & Throughput */}
            <div className="md:col-span-7 rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkle size={18} weight="fill" className="text-secondary-foreground" />
                    <h3 className="text-base font-semibold text-foreground">
                      Spend &amp; throughput
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-primary">
                    Live System Stats
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3">
                  <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                    <div className="text-lg font-bold font-mono text-foreground truncate">
                      {formatCurrency(totalQueueValue)}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Queue Volume</div>
                  </div>
                  <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                    <div className="text-lg font-bold font-mono text-primary">
                      {totalCount > 0 ? `${Math.round((readyCount / totalCount) * 100)}%` : "0%"}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Auto-match rate</div>
                  </div>
                  <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                    <div className="text-lg font-bold font-mono text-foreground truncate">
                      {totalCount > 0 && totalQueueValue > 0 ? formatCurrency(totalQueueValue / totalCount) : "₹0.00"}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avg invoice</div>
                  </div>
                  <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                    <div className="text-lg font-bold font-mono text-secondary-foreground">
                      {totalCount}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Ingested</div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={14} weight="bold" className="text-primary" />
                  <span>Durable idempotency &amp; ledger lock active</span>
                </span>
                <Link href="/vendors" className="font-semibold text-primary hover:underline">
                  Procurement Directory →
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Full Data Table List View */
        <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold leading-tight text-foreground">
                All Invoices &amp; Audit Runs ({runs.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Full durable audit log of all ingested invoice documents, decisions, and sign-offs
              </p>
            </div>
            <Link
              href="/invoices"
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>Audit History</span>
              <ArrowUpRight size={13} weight="bold" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-medium uppercase text-[10px] tracking-wide">
                <tr>
                  <th className="py-3 px-6">INVOICE</th>
                  <th className="py-3 px-6">VENDOR</th>
                  <th className="py-3 px-6">PO</th>
                  <th className="py-3 px-6">AMOUNT</th>
                  <th className="py-3 px-6">SUBMITTED</th>
                  <th className="py-3 px-6">STATUS</th>
                  <th className="py-3 px-6 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition group">
                    <td className="py-3.5 px-6 font-mono font-semibold text-foreground">
                      {r.invoice_number || (
                        <span className="text-muted-foreground font-mono text-[11px] truncate block max-w-[140px]">
                          {r.original_filename}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-foreground font-medium truncate max-w-xs">
                      {r.vendor?.legal_name || (
                        <span className="text-muted-foreground italic text-[11px]">Unmatched vendor</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-muted-foreground">
                      {r.purchase_order?.po_number || "—"}
                    </td>
                    <td className="py-3.5 px-6 font-mono font-semibold text-foreground tabular-nums">
                      {r.grand_total ? formatCurrency(r.grand_total) : "—"}
                    </td>
                    <td className="py-3.5 px-6 text-muted-foreground text-[11px]">
                      {formatDateTime(r.created_at)}
                    </td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={r.decision_status || r.processing_state} />
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Link
                        href={`/runs/${r.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-card border border-border hover:bg-muted text-foreground font-semibold text-xs transition shadow-2xs cursor-pointer"
                      >
                        <span>View</span>
                        <ArrowUpRight size={13} weight="bold" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {runs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                      No invoice records found in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
