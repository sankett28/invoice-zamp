import React from "react";
import { CheckCircle, AlertTriangle, XCircle, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { InvoiceDecision } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DecisionCardProps {
  decision: InvoiceDecision | null;
  processingState: string;
  decisionStatus: string | null;
}

export function DecisionCard({ decision, processingState, decisionStatus }: DecisionCardProps) {
  if (processingState === "PROCESSING" || processingState === "QUEUED") {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center py-10 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <h4 className="font-semibold text-slate-800 text-sm">Evaluating Deterministic Rules...</h4>
        <p className="text-xs text-slate-500 max-w-sm">
          Extracting document text, checking master data, validating duplicate status, and calculating PO balances.
        </p>
      </div>
    );
  }

  const status = decision?.status || decisionStatus || "REVIEW_REQUIRED";

  let title = "Ready for AP Approval";
  let summary = decision?.summary || "All required validation checks passed.";
  let action = decision?.recommended_action || "Proceed with standard Accounts Payable sign-off.";
  let badgeStyle = "bg-emerald-50 border-emerald-200 text-emerald-800";
  let Icon = CheckCircle;
  let iconColor = "text-emerald-600";

  if (status === "BLOCKED") {
    title = "Invoice Blocked";
    badgeStyle = "bg-rose-50 border-rose-200 text-rose-800";
    Icon = XCircle;
    iconColor = "text-rose-600";
  } else if (status === "REVIEW_REQUIRED") {
    title = "Human Review Required";
    badgeStyle = "bg-amber-50 border-amber-200 text-amber-800";
    Icon = AlertTriangle;
    iconColor = "text-amber-600";
  }

  return (
    <div className={cn("border rounded-xl p-5 shadow-sm space-y-4", badgeStyle)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/80 shadow-xs">
            <Icon className={cn("w-6 h-6", iconColor)} />
          </div>
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500 block">
              Automated Decision
            </span>
            <h3 className="text-lg font-bold tracking-tight text-slate-900">{title}</h3>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-white/70 border border-current text-slate-700">
          {status}
        </span>
      </div>

      <p className="text-sm text-slate-700 leading-relaxed font-medium bg-white/50 p-3 rounded-lg border border-slate-200/50">
        {summary}
      </p>

      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-700">
        <div className="flex items-center gap-1.5 font-medium">
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          <span>Recommended Next Action:</span>
          <span className="font-semibold text-slate-900">{action}</span>
        </div>
      </div>

      {decision?.reason_codes && decision.reason_codes.length > 0 && (
        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
          <span className="text-[11px] text-slate-500">Triggered Rules:</span>
          {decision.reason_codes.map((code) => (
            <span key={code} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white text-slate-700 border border-slate-200">
              {code}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
