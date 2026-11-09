import React from "react";
import { CheckCircle, Warning, Prohibit, ArrowRight, SpinnerGap } from "@phosphor-icons/react";
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
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col items-center justify-center text-center py-10 space-y-3 transition-colors">
        <SpinnerGap size={28} weight="bold" className="text-primary animate-spin" />
        <h4 className="font-semibold text-foreground text-sm">
          Evaluating Deterministic Rules...
        </h4>
        <p className="text-xs text-muted-foreground max-w-sm">
          Extracting document text, checking master data, validating duplicate status, and calculating PO balances.
        </p>
      </div>
    );
  }

  const status = decision?.status || decisionStatus || "REVIEW_REQUIRED";

  let title = "Ready for AP Approval";
  let summary = decision?.summary || "All required validation checks passed.";
  let action = decision?.recommended_action || "Proceed with standard Accounts Payable sign-off.";
  let containerStyle = "bg-primary/5 border-primary/25 ring-1 ring-primary/20";
  let Icon = CheckCircle;
  let iconColor = "text-primary";
  let badgeColor = "bg-primary/10 text-primary border-primary/25";

  if (status === "BLOCKED") {
    title = "Invoice Blocked";
    containerStyle = "bg-destructive/5 border-destructive/25 ring-1 ring-destructive/20";
    Icon = Prohibit;
    iconColor = "text-destructive";
    badgeColor = "bg-destructive/10 text-destructive border-destructive/25";
  } else if (status === "REVIEW_REQUIRED") {
    title = "Human Review Required";
    containerStyle = "bg-secondary/15 border-secondary/40 ring-1 ring-secondary/30";
    Icon = Warning;
    iconColor = "text-secondary-foreground";
    badgeColor = "bg-secondary/30 text-secondary-foreground border-secondary/50";
  }

  return (
    <div className={cn("rounded-2xl border p-5 sm:p-6 shadow-xs space-y-4 transition-colors", containerStyle)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-card border border-border shadow-2xs">
            <Icon size={22} weight="fill" className={iconColor} />
          </div>
          <div>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block">
              Automated Decision
            </span>
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              {title}
            </h3>
          </div>
        </div>
        <span
          className={cn(
            "text-xs px-2.5 py-1 rounded-full font-mono font-semibold border shadow-2xs",
            badgeColor
          )}
        >
          {status}
        </span>
      </div>

      <p className="text-xs text-foreground/80 leading-relaxed font-medium bg-card p-3.5 rounded-xl border border-border">
        {summary}
      </p>

      <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-foreground">
        <div className="flex items-center gap-1.5 font-medium flex-wrap">
          <ArrowRight size={13} weight="bold" className="text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Recommended Action:</span>
          <span className="font-semibold text-foreground">{action}</span>
        </div>
      </div>

      {decision?.reason_codes && decision.reason_codes.length > 0 && (
        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
          <span className="text-[11px] text-muted-foreground font-medium">Triggered Rules:</span>
          {decision.reason_codes.map((code) => (
            <span
              key={code}
              className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-card text-foreground border border-border"
            >
              {code}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
