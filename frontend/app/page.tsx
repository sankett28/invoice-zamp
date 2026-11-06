"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Upload,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  RefreshCw,
  Building2,
  Sparkles,
  Inbox,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  HelpCircle,
  Clock,
  Eye,
} from "lucide-react";
import { api, RunSummary } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function OverviewPage() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const data = await api.listRuns(undefined, 10, 0);
      setRuns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const totalCount = runs.length;
  const readyCount = runs.filter((r) => r.decision_status === "READY_FOR_AP_APPROVAL").length;
  const reviewCount = runs.filter((r) => r.decision_status === "REVIEW_REQUIRED").length;
  const blockedCount = runs.filter((r) => r.decision_status === "BLOCKED").length;

  return (
    <div className="space-y-8 max-w-7xl w-full mx-auto">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              LedgerFlow Operations Console
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
              Live v1.0
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Autonomous Accounts Payable automation with AI extraction & deterministic financial validation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchRuns}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/80 transition shadow-xs cursor-pointer"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600 dark:text-indigo-400" : ""}`} />
          </button>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium text-sm transition shadow-sm shadow-indigo-500/25 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-indigo-200" />
            <span>Process New Invoice</span>
          </Link>
        </div>
      </div>

      {/* Architecture & How It Works Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 rounded-2xl p-6 sm:p-7 text-white shadow-lg border border-indigo-950">
        <div className="relative z-10 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Core Architectural Boundary</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Deterministic Decision Engine • 16 Locked Business Rules
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                How LedgerFlow Automates Your Invoices
              </h2>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Large Language Models handle <strong className="text-white">unstructured PDF extraction</strong> into typed JSON with verified source quotes. 
                Our <strong className="text-emerald-400">deterministic Python engine</strong> performs all math, duplicate checks, PO budget tracking, and approval decisions. AI never approves an invoice.
              </p>
            </div>

            {/* 4 Steps visual pipeline */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5 backdrop-blur-xs">
                <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                  <Upload className="w-3.5 h-3.5" />
                  <span>1. Ingestion & Vision</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-snug">
                  PyMuPDF text parser with automatic multimodal vision for low-res scans.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5 backdrop-blur-xs">
                <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>2. Master Validation</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-snug">
                  Exact Tax ID (GSTIN) matching, vendor status checks, and PO ownership.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5 backdrop-blur-xs">
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>3. Reconciliation</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-snug">
                  Line item math, ₹1.00 rounding allowance, and strict PO tolerance cap.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5 backdrop-blur-xs">
                <div className="flex items-center gap-1.5 text-purple-300 font-semibold">
                  <Eye className="w-3.5 h-3.5" />
                  <span>4. Human In The Loop</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-snug">
                  Embedded PDF viewer with 1-click candidate PO assignment and audit logs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {/* Total Invoices */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Processed
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
              <FileText className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-white mt-3">
            {totalCount}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 block">
            Ingested across 13 workflow stages
          </span>
        </div>

        {/* Ready for AP Approval */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs hover:border-emerald-200 dark:hover:border-emerald-800/80 transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Ready for AP
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 mt-3">
            {readyCount}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 block">
            Passed all deterministic rules
          </span>
        </div>

        {/* Review Required */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs hover:border-amber-200 dark:hover:border-amber-800/80 transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Review Required
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400 mt-3">
            {reviewCount}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 block">
            Missing PO or variance alert
          </span>
        </div>

        {/* Blocked Submissions */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs hover:border-rose-200 dark:hover:border-rose-800/80 transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Blocked Runs
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
              <XCircle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400 mt-3">
            {blockedCount}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 block">
            Duplicates or invalid vendors
          </span>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xs overflow-hidden transition-colors">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white text-base">
              Recent Processing Runs
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Inspected invoices and real-time execution results
            </p>
          </div>
          <Link
            href="/invoices"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1 transition"
          >
            <span>View All Runs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {runs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Inbox className="w-6 h-6" />
            </div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No invoices in current database session
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              Click &quot;Process New Invoice&quot; to test your invoices or run through pre-built benchmark test cases.
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-500 transition shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Invoice to Test</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Invoice # / Document</th>
                  <th className="py-3.5 px-4">Vendor</th>
                  <th className="py-3.5 px-4">PO Reference</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Submitted At</th>
                  <th className="py-3.5 px-4">Decision Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {runs.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                  >
                    {/* Invoice identifier */}
                    <td className="py-3 px-4">
                      {r.invoice_number ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 text-xs">
                            {r.invoice_number}
                          </span>
                        </div>
                      ) : (
                        <div
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-mono text-[11px] max-w-[200px]"
                          title={r.original_filename}
                        >
                          <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{r.original_filename}</span>
                        </div>
                      )}
                    </td>

                    {/* Vendor */}
                    <td className="py-3 px-4 truncate max-w-xs">
                      {r.vendor?.legal_name ? (
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {r.vendor.legal_name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 italic text-[11px]">
                          <Building2 className="w-3 h-3" />
                          <span>Unmatched Vendor</span>
                        </span>
                      )}
                    </td>

                    {/* PO Reference */}
                    <td className="py-3 px-4">
                      {r.purchase_order?.po_number ? (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] font-medium">
                          {r.purchase_order.po_number}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 font-mono">—</span>
                      )}
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {r.grand_total ? (
                        formatCurrency(r.grand_total)
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 font-normal">—</span>
                      )}
                    </td>

                    {/* Submitted At */}
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      {formatDateTime(r.created_at)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      <StatusBadge status={r.decision_status || r.processing_state} />
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/runs/${r.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium text-xs transition cursor-pointer"
                      >
                        <span>Inspect</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
