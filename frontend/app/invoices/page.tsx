"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Filter, ArrowUpRight, Upload, RefreshCw } from "lucide-react";
import { api, RunSummary } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const TABS = [
  { key: "ALL", label: "All Runs" },
  { key: "READY_FOR_AP_APPROVAL", label: "Ready for Approval" },
  { key: "REVIEW_REQUIRED", label: "Review Required" },
  { key: "BLOCKED", label: "Blocked" },
  { key: "PROCESSING", label: "In Flight" },
];

export default function InvoicesListPage() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchRuns = async (statusKey = activeTab) => {
    try {
      setLoading(true);
      const data = await api.listRuns(statusKey === "ALL" ? undefined : statusKey);
      setRuns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns(activeTab);
  }, [activeTab]);

  const filteredRuns = runs.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const invNum = (r.invoice_number || "").toLowerCase();
    const vendorName = (r.vendor?.legal_name || "").toLowerCase();
    const poNum = (r.purchase_order?.po_number || "").toLowerCase();
    return invNum.includes(q) || vendorName.includes(q) || poNum.includes(q);
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoice History & Runs</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Full durable audit log of all invoice submissions and automated decisions.
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 transition shadow-sm"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Invoice</span>
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Filter Tabs and Search Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                  activeTab === tab.key
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search invoice, vendor, or PO..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs w-64 focus:outline-hidden focus:ring-1 focus:ring-slate-900 text-slate-900"
              />
            </div>
            <button
              onClick={() => fetchRuns(activeTab)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Invoices List Table */}
        {filteredRuns.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            {loading ? "Loading runs..." : "No invoices found matching current criteria."}
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
                {filteredRuns.map((r) => (
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
