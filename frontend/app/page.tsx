"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Upload, ArrowUpRight, CheckCircle2, AlertTriangle, XCircle, FileText, RefreshCw } from "lucide-react";
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
    <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* Top Banner / Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AP Processing Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time Accounts Payable pipeline metrics and execution queue.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchRuns}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition shadow-sm"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Process New Invoice</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Volume</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">{totalCount}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Invoices recorded</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
            <span>Ready for AP Approval</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-2">{readyCount}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Passed deterministic rules</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-700 font-medium">
            <span>Review Required</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-2">{reviewCount}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Discrepancies / uncertainty</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-rose-700 font-medium">
            <span>Blocked Submissions</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-700 mt-2">{blockedCount}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Duplicates & policy violations</span>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Recent Processing Runs</h2>
            <p className="text-xs text-slate-500">Inspected invoices and real-time execution results</p>
          </div>
          <Link
            href="/invoices"
            className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
          >
            <span>View All Runs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {runs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No invoices processed yet. Click "Process New Invoice" above to upload a sample PDF.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">PO Reference</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4">Decision Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {r.invoice_number || (
                        <span className="text-slate-400 italic">#{r.original_filename.substring(0, 15)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium truncate max-w-xs">
                      {r.vendor?.legal_name || "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {r.purchase_order?.po_number || "—"}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatCurrency(r.grand_total)}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {formatDateTime(r.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={r.decision_status || r.processing_state} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/runs/${r.id}`}
                        className="inline-flex items-center gap-1 text-slate-900 hover:text-slate-700 font-medium text-xs hover:underline"
                      >
                        <span>View Run</span>
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
