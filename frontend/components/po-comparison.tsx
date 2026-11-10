import React from "react";
import { Question, Warning, CheckCircle } from "@phosphor-icons/react";
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
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-3.5 transition-colors">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Question size={18} weight="bold" className="text-secondary-foreground" />
          <h3 className="text-base font-semibold text-foreground leading-tight">
            Purchase Order Reconciliation
          </h3>
        </div>

        <div className="p-3.5 rounded-xl bg-secondary/15 border border-secondary/35 text-xs text-foreground/90">
          <p className="font-semibold">No purchase order is currently confirmed for this run.</p>
          <p className="mt-1 text-muted-foreground">
            A purchase order must be assigned and verified before financial tolerance checks can be determined.
          </p>
        </div>

        {candidates.length > 0 && (
          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-foreground block">
              Suggested Candidates Found:
            </span>
            <div className="space-y-2">
              {candidates.map((cand: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-border bg-background text-xs flex justify-between items-center"
                >
                  <div>
                    <span className="font-mono font-semibold text-foreground">
                      {cand.po_number}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      Total: {formatCurrency(cand.po_total)}
                    </span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5">
                      {cand.reasons?.join(" • ")}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
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
  const remainingAfter =
    poBalDetails.remaining_after || (parseFloat(remainingBefore) - parseFloat(invoiceTotal)).toFixed(2);
  const isWarning = poBalDetails.tolerance_warning;
  const isExceeded = parseFloat(remainingAfter) < 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <h3 className="text-base font-semibold text-foreground leading-tight">
            Purchase Order Budget &amp; Tolerance
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Linked to PO: <span className="font-mono font-semibold text-primary">{po.po_number}</span>
          </p>
        </div>
        <span
          className={cn(
            "text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold border",
            isExceeded
              ? "bg-destructive/10 text-destructive border-destructive/25"
              : isWarning
              ? "bg-secondary/30 text-secondary-foreground border-secondary/40"
              : "bg-primary/10 text-primary border-primary/25"
          )}
        >
          {isExceeded ? "Exceeded" : isWarning ? "Near Cap" : "Within Balance"}
        </span>
      </div>

      {/* Financial Comparison Summary Cards */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-background border border-border">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block">
            Total PO Value
          </span>
          <span className="font-mono font-bold text-foreground block mt-1 text-sm tabular-nums">
            {formatCurrency(poTotal)}
          </span>
          <span className="text-[10px] text-muted-foreground block mt-0.5">
            Prior Spent: {formatCurrency(priorCommitted)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-background border border-border">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block">
            Available Before Invoice
          </span>
          <span className="font-mono font-bold text-foreground block mt-1 text-sm tabular-nums">
            {formatCurrency(remainingBefore)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-background border border-border">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block">
            Current Invoice Total
          </span>
          <span className="font-mono font-bold text-primary block mt-1 text-sm tabular-nums">
            {formatCurrency(invoiceTotal)}
          </span>
        </div>

        <div
          className={cn(
            "p-3 rounded-xl border",
            isExceeded
              ? "bg-destructive/5 border-destructive/25 text-destructive"
              : "bg-primary/5 border-primary/25 text-primary"
          )}
        >
          <span className="block text-[10px] font-medium uppercase tracking-wide opacity-80">
            Remaining After Approval
          </span>
          <span className="font-mono font-bold block mt-1 text-sm tabular-nums">
            {formatCurrency(remainingAfter)}
          </span>
        </div>
      </div>
    </div>
  );
}
