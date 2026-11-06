"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Download, RefreshCw, AlertCircle, FileText, Eye, EyeOff } from "lucide-react";
import { api, RunDetail } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import { RunTimeline } from "@/components/run-timeline";
import { DecisionCard } from "@/components/decision-card";
import { InvoiceSummary } from "@/components/invoice-summary";
import { POComparison } from "@/components/po-comparison";
import { RuleResults } from "@/components/rule-results";
import { ReviewForm } from "@/components/review-form";
import { formatDateTime } from "@/lib/utils";

export default function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const resolvedParams = use(params);
  const runId = resolvedParams.runId;

  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState<boolean>(false);

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
      // Poll every 1000ms if active
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

  if (loading && !run) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3 min-h-[60vh]">
        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
        <span className="text-sm font-medium text-slate-500">Retrieving processing run...</span>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm">Error Loading Run</h3>
            <p className="text-xs text-rose-700 mt-1">{error || "Run record not found."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* Top Breadcrumb & Metadata Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchRun}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowPdf(!showPdf)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition shadow-xs"
              title="Toggle PDF Document Preview"
            >
              {showPdf ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPdf ? "Hide PDF" : "Preview PDF"}</span>
            </button>
            <a
              href={api.getFileUrl(run.id)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </a>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {run.invoice_number ? `Invoice #${run.invoice_number}` : run.original_filename}
              </h1>
              <StatusBadge status={run.decision_status || run.processing_state} />
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 font-mono">
              <span>Run ID: {run.id.substring(0, 13)}...</span>
              <span>•</span>
              <span>Submitted: {formatDateTime(run.created_at)}</span>
              {run.completed_at && (
                <>
                  <span>•</span>
                  <span>Completed: {formatDateTime(run.completed_at)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Document Preview Panel (Collapsible) */}
      {showPdf && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-medium text-slate-700">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              Source Document: {run.original_filename}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">SHA-256: {run.file_sha256.substring(0, 16)}...</span>
          </div>
          <div className="w-full h-[650px] bg-slate-100">
            <iframe
              src={api.getFileUrl(run.id)}
              className="w-full h-full border-0"
              title="Invoice PDF Preview"
            />
          </div>
        </div>
      )}

      {/* Two-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Pipeline & Rules Engine) */}
        <div className="lg:col-span-7 space-y-6">
          <RunTimeline stages={run.stages} processingState={run.processing_state} />
          <RuleResults ruleResults={run.rule_results} />
        </div>

        {/* Right Column (Decision, Data, PO, Review Form) */}
        <div className="lg:col-span-5 space-y-6">
          <DecisionCard
            decision={run.decision}
            processingState={run.processing_state}
            decisionStatus={run.decision_status}
          />
          <InvoiceSummary run={run} />
          <POComparison run={run} />
          <ReviewForm
            runId={run.id}
            existingEvents={run.review_events}
            candidatePOs={run.purchase_order ? [run.purchase_order] : []}
            onReviewSubmitted={fetchRun}
          />
        </div>
      </div>
    </div>
  );
}
