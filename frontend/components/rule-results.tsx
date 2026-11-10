import React from "react";
import { CheckCircle, XCircle, Warning, MinusCircle } from "@phosphor-icons/react";
import { RuleResult } from "@/lib/api";
import { cn } from "@/lib/utils";

interface RuleResultsProps {
  ruleResults: RuleResult[];
}

export function RuleResults({ ruleResults }: RuleResultsProps) {
  if (!ruleResults || ruleResults.length === 0) {
    return null;
  }

  const passedCount = ruleResults.filter((r) => r.status === "PASS").length;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
      <div className="flex items-center justify-between pb-3.5 border-b border-border">
        <div>
          <h3 className="text-base font-semibold text-foreground leading-tight">
            Deterministic Rule Audit Log
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every financial, policy, and duplicate rule evaluated
          </p>
        </div>
        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-muted text-foreground border border-border">
          {passedCount} / {ruleResults.length} Passed
        </span>
      </div>

      <div className="divide-y divide-border">
        {ruleResults.map((r) => {
          let Icon = CheckCircle;
          let iconColor = "text-primary";
          let badgeStyle = "bg-primary/10 text-primary border-primary/20";

          if (r.status === "FAIL") {
            if (r.severity === "BLOCK") {
              Icon = XCircle;
              iconColor = "text-destructive";
              badgeStyle = "bg-destructive/10 text-destructive border-destructive/25 font-semibold";
            } else {
              Icon = Warning;
              iconColor = "text-secondary-foreground";
              badgeStyle = "bg-secondary/30 text-secondary-foreground border-secondary/40";
            }
          } else if (r.status === "WARNING") {
            Icon = Warning;
            iconColor = "text-secondary-foreground";
            badgeStyle = "bg-secondary/30 text-secondary-foreground border-secondary/40";
          } else if (r.status === "NOT_APPLICABLE") {
            Icon = MinusCircle;
            iconColor = "text-muted-foreground";
            badgeStyle = "bg-muted text-muted-foreground border-border";
          }

          return (
            <div key={r.id || r.rule_id} className="py-3.5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Icon size={16} weight="fill" className={cn("shrink-0 mt-0.5", iconColor)} />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-foreground">
                      {r.rule_id}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {r.rule_name}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {r.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-mono border", badgeStyle)}>
                  {r.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
