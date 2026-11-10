"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  MagnifyingGlass,
  ArrowUpRight,
  UploadSimple,
  ArrowsClockwise,
  FileCsv,
  FileCode,
  FileText,
  Buildings,
  FolderOpen,
} from "@phosphor-icons/react";
import { api, RunSummary } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const TABS = [
  { key: "ALL", label: "All Invoices" },
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
    const filename = (r.original_filename || "").toLowerCase();
    return invNum.includes(q) || vendorName.includes(q) || poNum.includes(q) || filename.includes(q);
  });

  return (
    <div className="space-y-8 max-w-7xl w-full mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold mb-2">
            <span>{runs.length} Invoices</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.15]">
            Invoice History
          </h1>
          <p className="text-foreground/75 text-sm sm:text-base mt-1.5 max-w-2xl leading-relaxed">
            Complete history of processed invoices, verification checks, and approval decisions.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={api.getExportUrl("csv", activeTab)}
            download="ledgerflow_ap_export.csv"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted font-medium text-xs transition shadow-xs cursor-pointer"
            title="Download ERP AP Journal CSV"
          >
            <FileCsv size={16} weight="bold" className="text-primary" />
            <span>Export CSV</span>
          </a>
          <a
            href={api.getExportUrl("json", activeTab)}
            download="ledgerflow_erp_export.json"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted font-medium text-xs transition shadow-xs cursor-pointer"
            title="Download ERP JSON"
          >
            <FileCode size={16} weight="bold" className="text-secondary-foreground" />
            <span>Export JSON</span>
          </a>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs transition shadow-xs cursor-pointer"
          >
            <UploadSimple size={15} weight="bold" />
            <span>Upload Invoice</span>
          </Link>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Filter Tabs and Search Bar */}
        <div className="p-4 sm:p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <MagnifyingGlass
                size={15}
                weight="bold"
                className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2"
              />
              <input
                type="text"
                placeholder="Search invoice, vendor, or PO..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl border border-border bg-background text-xs w-64 focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <button
              onClick={() => fetchRuns(activeTab)}
              className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
              title="Refresh"
            >
              <ArrowsClockwise
                size={15}
                weight="bold"
                className={loading ? "animate-spin text-primary" : ""}
              />
            </button>
          </div>
        </div>

        {/* Invoices List Table */}
        {filteredRuns.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <FolderOpen size={24} weight="regular" />
            </div>
            <div className="text-sm font-semibold text-foreground">
              {loading ? "Loading audit runs..." : "No invoices found"}
            </div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No matching records for current filter tab or search keyword.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-medium uppercase text-[10px] tracking-wide">
                <tr>
                  <th className="py-3 px-5">Invoice # / Document</th>
                  <th className="py-3 px-5">Vendor</th>
                  <th className="py-3 px-5">PO Reference</th>
                  <th className="py-3 px-5">Total Amount</th>
                  <th className="py-3 px-5">Submitted At</th>
                  <th className="py-3 px-5">Decision Status</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRuns.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-muted/30 transition group"
                  >
                    <td className="py-3.5 px-5">
                      {r.invoice_number ? (
                        <span className="font-mono font-semibold text-foreground text-xs">
                          {r.invoice_number}
                        </span>
                      ) : (
                        <div
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono text-[11px] max-w-[200px]"
                          title={r.original_filename}
                        >
                          <FileText size={13} weight="regular" className="shrink-0" />
                          <span className="truncate">{r.original_filename}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-5 truncate max-w-xs">
                      {r.vendor?.legal_name ? (
                        <span className="font-medium text-foreground">
                          {r.vendor.legal_name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground italic text-[11px]">
                          <Buildings size={13} weight="regular" />
                          <span>Unmatched Vendor</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-5">
                      {r.purchase_order?.po_number ? (
                        <span className="px-2 py-0.5 rounded-md bg-muted border border-border text-foreground font-mono text-[11px] font-medium">
                          {r.purchase_order.po_number}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-mono">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-5 font-mono font-semibold text-foreground tabular-nums">
                      {r.grand_total ? (
                        formatCurrency(r.grand_total)
                      ) : (
                        <span className="text-muted-foreground font-normal">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-5 text-muted-foreground text-[11px]">
                      {formatDateTime(r.created_at)}
                    </td>

                    <td className="py-3.5 px-5">
                      <StatusBadge status={r.decision_status || r.processing_state} />
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <Link
                        href={`/runs/${r.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-card border border-border hover:bg-muted text-foreground font-medium text-xs transition shadow-2xs cursor-pointer"
                      >
                        <span>View</span>
                        <ArrowUpRight size={13} weight="bold" />
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
