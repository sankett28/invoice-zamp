"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, FileCode, CheckCircle2, AlertCircle } from "lucide-react";
import { RunDetail } from "@/lib/api";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

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
  const evidence = ext.evidence || {};

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Extracted Invoice Details</h3>
          <p className="text-xs text-slate-500">Normalised structured record with extraction provenance</p>
        </div>
        <div className="flex items-center gap-2">
          {meta.is_scanned_or_ocr ? (
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
              Vision / OCR
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
              Digital Text
            </span>
          )}
        </div>
      </div>

      {/* Grid of key fields */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Vendor</span>
          <span className="font-medium text-slate-900 block truncate mt-0.5">
            {vendor.name || "—"}
          </span>
          {run.vendor ? (
            <span className="text-[10px] text-emerald-700 font-medium inline-flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" /> Matched ({run.vendor.vendor_code})
            </span>
          ) : (
            <span className="text-[10px] text-amber-700 font-medium inline-flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" /> Unmatched
            </span>
          )}
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Invoice Number</span>
          <span className="font-mono font-semibold text-slate-900 block mt-0.5">
            {invoice.number || "—"}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">
            Date: {formatDate(invoice.date)}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">PO Reference</span>
          <span className="font-mono font-medium text-slate-900 block mt-0.5">
            {invoice.po_number || "— (No PO on file)"}
          </span>
          {run.purchase_order ? (
            <span className="text-[10px] text-emerald-700 font-medium inline-flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" /> {run.purchase_order.po_number}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 block mt-1">No PO associated</span>
          )}
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Grand Total</span>
          <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5">
            {formatCurrency(amounts.grand_total || run.grand_total)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Subtotal: {formatCurrency(amounts.subtotal)} | Tax: {formatCurrency(amounts.tax_total)}
          </span>
        </div>
      </div>

      {/* Expandable Evidence View */}
      <div className="pt-2 border-t border-slate-100">
        <button
          onClick={() => setShowEvidence(!showEvidence)}
          className="flex items-center justify-between w-full text-xs font-medium text-slate-600 hover:text-slate-900 transition py-1"
        >
          <span className="flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-slate-400" />
            Inspection & Source Evidence Trace
          </span>
          {showEvidence ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showEvidence && (
          <div className="mt-2.5 p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] space-y-2">
            <div className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider border-b border-slate-800 pb-1">
              Ground-Truth Provenance Quotes
            </div>
            {Object.keys(evidence).length === 0 ? (
              <p className="text-slate-500">No explicit snippet evidence stored.</p>
            ) : (
              Object.entries(evidence).map(([k, v]: [string, any]) => (
                <div key={k} className="leading-snug">
                  <span className="text-emerald-400">{k}:</span>{" "}
                  <span className="text-slate-300">"{v?.raw_text || '—'}"</span>{" "}
                  <span className="text-slate-500 text-[10px]">(Page {v?.page_number || 1}, {v?.extraction_method})</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
