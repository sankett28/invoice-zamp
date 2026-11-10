"use client";

import React, { useState } from "react";
import { CaretDown, CaretUp, Code, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { RunDetail } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

interface InvoiceSummaryProps {
  run: RunDetail;
}

export function InvoiceSummary({ run }: InvoiceSummaryProps) {
  const [showEvidence, setShowEvidence] = useState(false);
  const ext = (run.extracted_data as any) || {};
  const vendor = ext.vendor || {};
  const invoice = ext.invoice || {};
  const amounts = ext.amounts || {};
  const meta = ext.extraction || {};

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
      <div className="flex items-center justify-between pb-3.5 border-b border-border">
        <div>
          <h3 className="text-base font-semibold text-foreground leading-tight">
            Extracted Invoice Details
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Normalised structured record with extraction provenance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {meta.is_scanned_or_ocr ? (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-secondary/30 text-secondary-foreground border border-secondary/40">
              Vision / OCR
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
              Digital Text
            </span>
          )}
        </div>
      </div>

      {/* Grid of key fields */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-background border border-border">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block">
            Vendor
          </span>
          <span className="font-semibold text-foreground block truncate mt-0.5">
            {vendor.name || "—"}
          </span>
          {run.vendor ? (
            <span className="text-[10px] text-primary font-semibold inline-flex items-center gap-1 mt-1">
              <CheckCircle size={12} weight="fill" /> Matched ({run.vendor.vendor_code})
            </span>
          ) : (
            <span className="text-[10px] text-secondary-foreground font-medium inline-flex items-center gap-1 mt-1">
              <WarningCircle size={12} weight="fill" /> Unmatched
            </span>
          )}
        </div>

        <div className="p-3 rounded-xl bg-background border border-border">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block">
            Invoice Number
          </span>
          <span className="font-mono font-semibold text-foreground block mt-0.5">
            {invoice.invoice_number || "—"}
          </span>
          <span className="text-[10px] text-muted-foreground block mt-1">
            Date: {formatDate(invoice.invoice_date)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-background border border-border">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block">
            PO Reference
          </span>
          <span className="font-mono font-semibold text-foreground block mt-0.5">
            {invoice.purchase_order_number || "—"}
          </span>
          <span className="text-[10px] text-muted-foreground block mt-1">
            Due: {formatDate(invoice.due_date)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-background border border-border">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block">
            Grand Total
          </span>
          <span className="font-mono font-bold text-foreground text-sm block mt-0.5 tabular-nums">
            {formatCurrency(amounts.grand_total || run.grand_total)}
          </span>
          <span className="text-[10px] text-muted-foreground block mt-1">
            Net: {formatCurrency(amounts.subtotal)} + Tax: {formatCurrency(amounts.tax_total)}
          </span>
        </div>
      </div>

      {/* Provenance / Evidence Toggle */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowEvidence(!showEvidence)}
          className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground py-1 transition cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Code size={14} weight="bold" className="text-primary" />
            <span>View Raw LLM &amp; OCR Extraction JSON</span>
          </span>
          {showEvidence ? <CaretUp size={13} weight="bold" /> : <CaretDown size={13} weight="bold" />}
        </button>

        {showEvidence && (
          <div className="mt-2.5 p-3.5 rounded-xl bg-foreground text-background text-[11px] font-mono overflow-x-auto max-h-56 border border-border">
            <pre>{JSON.stringify(run.extracted_data, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
