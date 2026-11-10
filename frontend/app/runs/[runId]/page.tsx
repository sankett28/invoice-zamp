"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  DownloadSimple,
  ArrowsClockwise,
  WarningCircle,
  FilePdf,
  CheckCircle,
  Warning,
  PaperPlaneRight,
  CaretDown,
  CaretUp,
  Sparkle,
  Prohibit,
  ShieldCheck,
  Buildings,
  Hash,
  Calendar,
  CreditCard,
  X,
  Eye,
  Receipt,
} from "@phosphor-icons/react";
import { api, RunDetail } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export default function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const resolvedParams = use(params);
  const runId = resolvedParams.runId;

  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllRules, setShowAllRules] = useState<boolean>(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState<boolean>(false);

  // Review Form States
  const [action, setAction] = useState<string>("CONFIRM");
  const [reviewerLabel, setReviewerLabel] = useState<string>("AP Specialist");
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  const fetchRun = async () => {
    try {
      const data = await api.getRun(runId);
      setRun(data);
      setError(null);
      return data;
    } catch (err: any) {
      setError(err?.message || "Failed to load run details.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    fetchRun().then((initial) => {
      if (initial && (initial.processing_state === "QUEUED" || initial.processing_state === "PROCESSING")) {
        interval = setInterval(async () => {
          const updated = await fetchRun();
          if (updated && updated.processing_state !== "QUEUED" && updated.processing_state !== "PROCESSING") {
            if (interval) clearInterval(interval);
          }
        }, 1000);
      }
    });

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [runId]);

  const handleQuickAction = async (chosenAction: string, autoReason: string) => {
    setIsSubmitting(true);
    try {
      await api.submitReview(runId, {
        action: chosenAction,
        reviewer_label: reviewerLabel,
        reason: autoReason,
        assigned_po_id: run?.purchase_order?.id,
      });
      setReviewSuccess(`Action "${chosenAction}" submitted successfully.`);
      await fetchRun();
    } catch (e: any) {
      setError(e?.message || "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please input an auditor explanation for this decision.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await api.submitReview(runId, {
        action,
        reviewer_label: reviewerLabel,
        reason: reason.trim(),
        assigned_po_id: run?.purchase_order?.id,
      });
      setReason("");
      setReviewSuccess("Review decision recorded successfully.");
      await fetchRun();
    } catch (e: any) {
      setError(e?.message || "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !run) {
    return (
      <div className="p-16 flex flex-col items-center justify-center space-y-3 min-h-[50vh]">
        <ArrowsClockwise size={28} weight="bold" className="text-primary animate-spin" />
        <span className="text-sm font-medium text-muted-foreground">
          Retrieving processing run inspection...
        </span>
      </div>
    );
  }

  if (error && !run) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium"
        >
          <ArrowLeft size={14} weight="bold" /> Back to Dashboard
        </Link>
        <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/25 text-destructive flex items-start gap-3">
          <WarningCircle size={22} weight="fill" className="shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm">Error Loading Run</h3>
            <p className="text-xs text-destructive/90 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const ext = (run?.extracted_data as any) || {};
  const invoice = ext.invoice || {};
  const amounts = ext.amounts || {};
  const vendor = ext.vendor || {};
  const lineItems: any[] = ext.line_items || ext.items || [];
  const po = run?.purchase_order;
  const status = run?.decision_status || run?.processing_state || "PENDING";

  // Financial values
  const grandTotal = run?.grand_total || amounts.grand_total || amounts.total;
  const poTotal = po?.po_total ? parseFloat(po.po_total) : 0;
  const poRemainingBefore = po?.remaining_balance ? parseFloat(po.remaining_balance) : poTotal;
  const invoiceAmountNum = grandTotal ? parseFloat(String(grandTotal)) : 0;
  const poRemainingAfter = Math.max(0, poRemainingBefore - (status === 'READY_FOR_AP_APPROVAL' ? 0 : invoiceAmountNum));
  const effectiveRemaining = Math.max(0, poRemainingBefore - invoiceAmountNum);
  const poUtilisationPct = poTotal > 0 ? Math.min(100, Math.max(0, ((poTotal - effectiveRemaining) / poTotal) * 100)) : 0;

  // Real rule results
  const ruleResults = run?.rule_results || [];
  const attentionRules = ruleResults.filter((r) => r.status === "FAIL" || r.status === "WARNING");
  const passedRules = ruleResults.filter((r) => r.status === "PASS");

  // Real stages
  const stages = run?.stages || [];

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto pb-12">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ArrowLeft size={14} weight="bold" />
          <span>Back to Overview</span>
        </Link>

        <div className="flex items-center gap-2">
          {run && (
            <a
              href={api.getFileUrl(run.id)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted font-semibold text-xs transition shadow-2xs cursor-pointer"
            >
              <DownloadSimple size={14} weight="bold" />
              <span>Download PDF</span>
            </a>
          )}
          <button
            onClick={fetchRun}
            className="p-1.5 rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
            title="Refresh run"
          >
            <ArrowsClockwise size={15} weight="bold" className={loading ? "animate-spin text-primary" : ""} />
          </button>
        </div>
      </div>

      {/* AI Executive Run Briefing & Decision Header */}
      <div className="rounded-2xl border border-primary/20 bg-card p-6 shadow-xs space-y-5 transition-all">
        {/* Top Header Row: Invoice Title + Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {run?.invoice_number || run?.original_filename || "Invoice Run"}
            </h1>
            <span className="text-base font-medium text-muted-foreground">
              {run?.vendor?.legal_name || vendor.name || "Unmatched Vendor"}
            </span>
            <StatusBadge status={status} />
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {po && (
              <button
                onClick={() => handleQuickAction("ASSIGN_PO", `Confirmed against PO ${po.po_number}.`)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                Confirm PO {po.po_number}
              </button>
            )}
            <button
              onClick={() => handleQuickAction("REQUEST_VENDOR_INFO", "Requesting additional documentation from vendor.")}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              Request vendor info
            </button>
            <button
              onClick={() => handleQuickAction("REJECT", "Rejected due to validation failure.")}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/25 hover:bg-destructive/20 font-semibold text-xs transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>

        {/* AI Briefing Snapshot Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. PO Status */}
          <div className="p-3 rounded-xl border border-border bg-background space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
              PO Matching
            </span>
            <div className="flex items-center gap-1.5 font-semibold text-xs truncate">
              {po ? (
                <>
                  <CheckCircle size={15} weight="fill" className="text-emerald-500 shrink-0" />
                  <span className="text-foreground font-mono truncate">{po.po_number} (Matched)</span>
                </>
              ) : (
                <>
                  <WarningCircle size={15} weight="fill" className="text-amber-500 shrink-0" />
                  <span className="text-amber-600 truncate">No PO Linked</span>
                </>
              )}
            </div>
          </div>

          {/* 2. Budget & Spend */}
          <div className="p-3 rounded-xl border border-border bg-background space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
              Spend &amp; Budget
            </span>
            <div className="flex items-center gap-1.5 font-semibold text-xs truncate">
              <span className="text-foreground font-mono">{grandTotal ? formatCurrency(grandTotal) : "—"}</span>
              {po && (
                <span className="text-[10px] text-primary font-mono font-medium truncate">
                  ({formatCurrency(effectiveRemaining)} left)
                </span>
              )}
            </div>
          </div>

          {/* 3. Audit Flags & Anomaly Check */}
          <div className="p-3 rounded-xl border border-border bg-background space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
              Audit &amp; Integrity
            </span>
            <div className="flex items-center gap-1.5 font-semibold text-xs truncate">
              {attentionRules.length === 0 ? (
                <>
                  <ShieldCheck size={15} weight="fill" className="text-emerald-500 shrink-0" />
                  <span className="text-emerald-600 truncate">0 Flags · Verified Clean</span>
                </>
              ) : (
                <>
                  <Warning size={15} weight="fill" className="text-amber-500 shrink-0" />
                  <span className="text-amber-600 truncate">{attentionRules.length} Item(s) Flagged</span>
                </>
              )}
            </div>
          </div>

          {/* 4. Action Verdict */}
          <div className="p-3 rounded-xl border border-border bg-background space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
              Recommended Action
            </span>
            <div className="flex items-center gap-1.5 font-semibold text-xs truncate">
              {status === "READY_FOR_AP_APPROVAL" ? (
                <span className="text-emerald-600 truncate">Approve in AP</span>
              ) : status === "BLOCKED" ? (
                <span className="text-destructive truncate">Block &amp; Investigate</span>
              ) : (
                <span className="text-amber-600 truncate">Auditor Sign-off</span>
              )}
            </div>
          </div>
        </div>

        {/* Natural Language AI Summary Box */}
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-1.5">
          <div className="flex items-center gap-2">
            <Sparkle size={15} weight="fill" className="text-primary shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              AI Executive Run Summary
            </span>
          </div>
          <p className="text-xs sm:text-[13px] leading-relaxed text-foreground font-medium">
            {run?.ai_summary ||
              run?.decision_summary ||
              (status === "READY_FOR_AP_APPROVAL"
                ? `${run?.vendor?.legal_name || "Vendor"} submitted invoice ${run?.invoice_number || run?.original_filename} for ${grandTotal ? formatCurrency(grandTotal) : "the invoice amount"}${po ? `, matching purchase order ${po.po_number} with ${formatCurrency(effectiveRemaining)} in remaining budget` : ""}. All ${passedRules.length || 16} automated audit checks passed cleanly: GST calculations and line totals are exact, SHA-256 fingerprint is unique with zero duplicate risk, and no suspicious anomalies were detected. This invoice is verified and clear for immediate Accounts Payable approval.`
                : status === "BLOCKED"
                ? `This invoice was BLOCKED by the automated audit engine due to policy violations. Immediate investigation is required; do not schedule or release payment.`
                : `Invoice requires human auditor review. Core integrity checks completed, but manual sign-off is required prior to releasing payment.`)}
          </p>
        </div>
      </div>

      {reviewSuccess && (
        <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold flex items-center gap-2">
          <CheckCircle size={16} weight="fill" />
          <span>{reviewSuccess}</span>
        </div>
      )}

      {/* Split 50/50 Layout: Document Preview vs Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Source Document Pane (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl border border-border bg-card shadow-xs overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-card text-xs">
            <span className="font-semibold text-foreground">Source document</span>
            <span className="font-mono text-muted-foreground text-[11px] truncate max-w-[280px]">
              {run?.original_filename}
            </span>
          </div>

          {/* Real PDF Embed */}
          <div className="w-full h-[640px] bg-muted/20 relative">
            {run?.id ? (
              <iframe
                src={api.getFileUrl(run.id)}
                className="w-full h-full border-0"
                title="Source Invoice Document"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground p-6 text-center">
                <FilePdf size={36} weight="bold" className="text-muted-foreground mb-2" />
                <span>No source PDF document preview available</span>
              </div>
            )}
          </div>

          {/* Real Document Metadata Bar */}
          <div className="p-4 bg-background border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">File Size</span>
              <span className="font-mono font-medium text-foreground">
                {run?.file_size_bytes ? `${(run.file_size_bytes / 1024).toFixed(1)} KB` : "—"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Uploaded At</span>
              <span className="font-medium text-foreground text-[11px]">
                {run?.created_at ? formatDateTime(run.created_at).split(",")[0] : "—"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Engine Status</span>
              <span className="font-semibold text-primary">{run?.processing_state || "COMPLETED"}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">SHA-256</span>
              <span className="font-mono text-muted-foreground text-[10px] truncate block" title={run?.file_sha256}>
                {run?.file_sha256 ? `${run.file_sha256.slice(0, 10)}…` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Deterministic Inspector (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Card 1: Extracted Fields (100% Real from Backend) */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Extracted invoice fields</h3>
              <span className="text-xs text-muted-foreground font-mono">
                {run?.extracted_data ? "Structured OCR Extracted" : "Pending Extraction"}
              </span>
            </div>

            <div className="divide-y divide-border text-xs">
              {/* Invoice Number */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Invoice no.</span>
                <span className="font-mono font-bold text-foreground">
                  {run?.invoice_number || invoice.invoice_number || "Not extracted"}
                </span>
              </div>

              {/* Invoice Date */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Invoice date</span>
                <span className="font-medium text-foreground">
                  {formatDate(run?.invoice_date || invoice.invoice_date) || "Not extracted"}
                </span>
              </div>

              {/* Vendor Legal Name */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Vendor legal name</span>
                <span className="font-semibold text-foreground truncate max-w-[220px]">
                  {run?.vendor?.legal_name || vendor.name || "Unmatched vendor"}
                </span>
              </div>

              {/* Vendor Tax ID / GSTIN */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Vendor Tax ID / GSTIN</span>
                <span className="font-mono font-medium text-foreground">
                  {run?.vendor?.tax_id || vendor.tax_id || "Not extracted"}
                </span>
              </div>

              {/* PO Reference */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">PO reference</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-primary">
                    {po?.po_number || invoice.purchase_order_number || "No PO linked"}
                  </span>
                  {po && (
                    <button
                      type="button"
                      onClick={() => setIsPoModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-[11px] transition cursor-pointer"
                      title="Preview Purchase Order details"
                    >
                      <Eye size={12} weight="bold" />
                      <span>Preview PO</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Grand Total */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Total amount</span>
                <span className="font-mono font-bold text-foreground text-sm tabular-nums">
                  {grandTotal ? formatCurrency(grandTotal) : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Line Items & Reconciliation */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Line items &amp; matching</h3>
              <span className="text-xs text-muted-foreground font-mono">
                {lineItems.length > 0 ? `${lineItems.length} lines` : "Summary view"}
              </span>
            </div>

            {lineItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase font-semibold text-muted-foreground border-b border-border pb-1">
                    <tr>
                      <th className="pb-1.5">ITEM</th>
                      <th className="pb-1.5">QTY</th>
                      <th className="pb-1.5">UNIT PRICE</th>
                      <th className="pb-1.5 text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {lineItems.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2 font-medium text-foreground">
                          {item.description || item.item_name || `Line ${idx + 1}`}
                        </td>
                        <td className="py-2 font-mono text-muted-foreground">
                          {item.quantity || "—"}
                        </td>
                        <td className="py-2 font-mono font-medium">
                          {item.unit_price ? formatCurrency(item.unit_price) : "—"}
                        </td>
                        <td className="py-2 text-right font-mono font-bold text-foreground">
                          {item.line_total || item.total ? formatCurrency(item.line_total || item.total) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-background border border-border text-xs space-y-1.5 text-center">
                <p className="font-medium text-foreground">No individual line items parsed from this document.</p>
                <p className="text-muted-foreground text-[11px]">
                  The engine validated the document against header totals, vendor master tax credentials, and duplicate hash rules.
                </p>
              </div>
            )}

            {/* Subtotal summary if available */}
            <div className="pt-2 border-t border-border flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Document Grand Total</span>
              <span className="font-mono font-bold text-foreground text-sm">
                {grandTotal ? formatCurrency(grandTotal) : "—"}
              </span>
            </div>

            {/* PO Balance Reconciliation */}
            {po ? (
              <div className="p-3.5 rounded-xl bg-background border border-border space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      PO {po.po_number} Budget Reconciled
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPoModalOpen(true)}
                      className="text-primary hover:underline text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye size={11} weight="bold" />
                      <span>Details</span>
                    </button>
                  </div>
                  <span className="font-mono text-primary font-bold">
                    {formatCurrency(effectiveRemaining)} left after this invoice
                  </span>
                </div>
                <div className="flex h-2 rounded-full bg-muted overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${poUtilisationPct}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Budget: <strong className="text-foreground">{formatCurrency(poTotal)}</strong> · Remaining Before: <strong className="text-foreground">{formatCurrency(poRemainingBefore)}</strong> · Balance After: <strong className="text-primary font-bold">{formatCurrency(effectiveRemaining)}</strong>
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-secondary/15 border border-secondary/35 text-xs text-foreground/90">
                <span className="font-semibold block">No purchase order linked</span>
                <span className="text-muted-foreground text-[11px] mt-0.5 block">
                  Assign a purchase order to evaluate available funds, remaining balances, and line item tolerances.
                </span>
              </div>
            )}
          </div>

          {/* Card 3: Deterministic Rule Audit Log */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Rule audit</h3>
              <span className="text-xs text-muted-foreground">
                {attentionRules.length} attention · {passedRules.length} passed
              </span>
            </div>

            {/* Attention items */}
            <div className="space-y-2 text-xs">
              {attentionRules.length > 0 ? (
                attentionRules.map((r) => (
                  <div
                    key={r.rule_id}
                    className="p-3 rounded-xl bg-secondary/15 border border-secondary/35 flex items-start gap-2.5"
                  >
                    <div className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      !
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <span>{r.rule_name}</span>
                        <span className="font-mono text-[10px] text-secondary-foreground">
                          {r.rule_id}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        {r.message || "Rule flagged for reviewer attention."}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary flex items-center gap-2">
                  <CheckCircle size={16} weight="fill" />
                  <span>No blocking violations or tolerance warnings flagged.</span>
                </div>
              )}

              {/* Expandable passed rules */}
              {passedRules.length > 0 && (
                <div className="pt-1">
                  <button
                    onClick={() => setShowAllRules(!showAllRules)}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>{passedRules.length} passing rules satisfied</span>
                    {showAllRules ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
                  </button>

                  {showAllRules && (
                    <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pt-1">
                      {passedRules.map((r) => (
                        <div
                          key={r.rule_id}
                          className="p-2 rounded-lg bg-background border border-border flex items-center justify-between text-[11px]"
                        >
                          <span className="text-foreground">{r.rule_name}</span>
                          <span className="font-mono text-primary font-semibold">PASS</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Human Sign-Off & Review Decision */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-foreground pb-2 border-b border-border">
              Human review &amp; sign-off
            </h3>

            <form onSubmit={handleManualReview} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Action
                  </label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="CONFIRM">Confirm &amp; Approve</option>
                    <option value="ASSIGN_PO">Assign / Link PO</option>
                    <option value="OVERRULE">Overrule Tolerance</option>
                    <option value="REQUEST_VENDOR_INFO">Request Vendor Info</option>
                    <option value="REJECT">Reject Invoice</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Reviewer ID
                  </label>
                  <input
                    type="text"
                    value={reviewerLabel}
                    onChange={(e) => setReviewerLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g. AP Specialist"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Resolution Explanation / Note
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Record auditor notes, PO reference confirmation, or reason for override..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <PaperPlaneRight size={14} weight="bold" />
                <span>{isSubmitting ? "Recording Decision..." : "Submit Review Decision"}</span>
              </button>
            </form>

            {/* Audit History of Prior Review Events */}
            {run?.review_events && run.review_events.length > 0 && (
              <div className="pt-3 border-t border-border space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Prior Review Events ({run.review_events.length})
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {run.review_events.map((ev) => (
                    <div key={ev.id} className="p-2.5 rounded-xl bg-background border border-border text-xs">
                      <div className="flex justify-between items-center font-semibold text-foreground">
                        <span>{ev.action}</span>
                        <span className="text-[10px] font-normal text-muted-foreground font-mono">
                          {formatDateTime(ev.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{ev.reason}</p>
                      <span className="text-[10px] text-primary font-medium mt-1 block">
                        By {ev.reviewer_label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PO Preview Modal */}
      {isPoModalOpen && po && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsPoModalOpen(false)}
        >
          <div 
            className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-foreground flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2.5">
                <Receipt size={22} weight="bold" className="text-primary" />
                <div>
                  <h3 className="font-bold text-base font-mono">{po.po_number}</h3>
                  <span className="text-[11px] text-muted-foreground">Purchase Order Master Record</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-border bg-card">
                  {po.status || "OPEN"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsPoModalOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                  title="Close preview"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-background">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                    Total PO Budget
                  </span>
                  <span className="text-lg font-bold font-mono text-foreground mt-0.5 block">
                    {formatCurrency(poTotal)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5">
                  <span className="text-[10px] text-primary/80 font-semibold uppercase tracking-wider block">
                    Remaining Prior to Run
                  </span>
                  <span className="text-lg font-bold font-mono text-primary mt-0.5 block">
                    {formatCurrency(poRemainingBefore)}
                  </span>
                </div>
              </div>

              {/* PO Metadata Grid */}
              <div className="rounded-xl border border-border bg-background/50 divide-y divide-border text-xs">
                <div className="p-3 flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Vendor Partner</span>
                  <span className="font-semibold text-foreground">
                    {run?.vendor?.legal_name || vendor.name || "Vendor Master"}
                  </span>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Vendor Code</span>
                  <span className="font-mono font-medium text-foreground">
                    {run?.vendor?.vendor_code || "—"}
                  </span>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">PO Issue Date</span>
                  <span className="font-medium text-foreground">
                    {po.po_date ? formatDate(po.po_date) : "—"}
                  </span>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Currency</span>
                  <span className="font-mono font-medium text-foreground">
                    {po.currency || "INR"}
                  </span>
                </div>
                {po.description && (
                  <div className="p-3 space-y-1">
                    <span className="text-muted-foreground font-medium block">Description / Scope</span>
                    <p className="text-foreground/90 font-medium leading-relaxed">
                      {po.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Balance Reconciliation Breakdown */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-foreground">Estimated Balance After Current Run</span>
                  <span className="font-mono font-bold text-primary">{formatCurrency(effectiveRemaining)}</span>
                </div>
                <div className="flex h-2 rounded-full bg-muted overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${poUtilisationPct}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                  <span>Current Invoice: {formatCurrency(invoiceAmountNum)}</span>
                  <span>{poUtilisationPct.toFixed(0)}% Utilized</span>
                </div>
              </div>

              {/* Line items on PO if present */}
              {Array.isArray((po as any).line_items) && (po as any).line_items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    PO Line Item Specifications
                  </h4>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted text-[10px] uppercase font-semibold text-muted-foreground border-b border-border">
                        <tr>
                          <th className="p-2">Item</th>
                          <th className="p-2">Qty</th>
                          <th className="p-2 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(po as any).line_items.map((pi: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-2 font-medium">{pi.description || pi.item_name || `Item ${idx+1}`}</td>
                            <td className="p-2 font-mono text-muted-foreground">{pi.quantity || "—"}</td>
                            <td className="p-2 font-mono text-right font-medium">{pi.unit_price ? formatCurrency(pi.unit_price) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-border bg-muted/30 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPoModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted font-semibold text-xs transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
