import React from "react";
import { AlertTriangle, CheckCircle2, FileQuestion } from "lucide-react";
import { RunDetail } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";

interface POComparisonProps {
  run: RunDetail;
}

export function POComparison({ run }: POComparisonProps) {
  const po = run.purchase_order;
  const stages = run.stages || [];
  const poStage = stages.find((s) => s.stage_key === "po_matching");
  const candidates = (poStage?.details as any)?.candidates || [];
  const poBalDetails = (stages.find((s) => s.stage_key === "po_balance_check")?.details as any) || {};

  if (!po) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <FileQuestion className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-slate-900 text-sm">Purchase Order Reconciliation</h3>
        </div>

        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <p className="font-medium">No purchase order is currently confirmed for this run.</p>
          <p className="mt-1 text-amber-700">
            A purchase order must be assigned and verified before financial tolerance checks can be determined.
          </p>
        </div>

        {candidates.length > 0 && (
          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-slate-700 block">Suggested Candidates Found:</span>
            <div className="space-y-1.5">
              {candidates.map((cand: any, idx: number) => (
                <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-mono font-semibold text-slate-900">{cand.po_number}</span>
                    <span className="text-slate-500 ml-2">Total: {formatCurrency(cand.po_total)}</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">{cand.reasons?.join(" • ")}</span>
                  </div>
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    Match Score: {cand.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const poTotal = poBalDetails.po_total || po.po_total;
  const priorCommitted = poBalDetails.prior_committed || "0.00";
  const remainingBefore = poBalDetails.remaining_before || po.remaining_balance || po.po_total;
  const invoiceTotal = poBalDetails.invoice_total || run.grand_total || "0.00";
  const remainingAfter = poBalDetails.remaining_after || (parseFloat(remainingBefore) - parseFloat(invoiceTotal)).toFixed(2);
  const isWarning = poBalDetails.tolerance_warning;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Purchase Order Balance Analysis</h3>
          <p className="text-xs text-slate-500 font-mono">Associated PO: {po.po_number}</p>
        </div>
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-700">
          Status: {po.status}
        </span>
      </div>

      {isWarning && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Tolerance Warning: </span>
            Invoice exceeds remaining PO budget but falls within the configured tolerance policy (₹
            {poBalDetails.allowed_variance}).
          </div>
        </div>
      )}

      {/* Financial Table */}
      <div className="divide-y divide-slate-100 text-xs">
        <div className="py-2 flex justify-between">
          <span className="text-slate-500">PO Approved Total:</span>
          <span className="font-mono font-semibold text-slate-900">{formatCurrency(poTotal)}</span>
        </div>
        <div className="py-2 flex justify-between">
          <span className="text-slate-500">Previously Committed / Invoiced:</span>
          <span className="font-mono text-slate-700">{formatCurrency(priorCommitted)}</span>
        </div>
        <div className="py-2 flex justify-between bg-slate-50/70 px-2 rounded font-medium">
          <span className="text-slate-700">Available PO Budget (Before Run):</span>
          <span className="font-mono font-bold text-slate-900">{formatCurrency(remainingBefore)}</span>
        </div>
        <div className="py-2 flex justify-between">
          <span className="text-slate-500">Current Invoice Total:</span>
          <span className="font-mono font-semibold text-slate-900">{formatCurrency(invoiceTotal)}</span>
        </div>
        <div className="py-2 flex justify-between">
          <span className="text-slate-500">Allowed Tolerance Cap:</span>
          <span className="font-mono text-slate-600">
            {formatCurrency(poBalDetails.allowed_variance || "500.00")} (1% / max ₹500)
          </span>
        </div>
        <div className="py-2.5 flex justify-between px-2 rounded bg-slate-900 text-white font-medium mt-1">
          <span>Projected Balance Remaining:</span>
          <span
            className={cn(
              "font-mono font-bold",
              parseFloat(remainingAfter) >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {formatCurrency(remainingAfter)}
          </span>
        </div>
      </div>
    </div>
  );
}
