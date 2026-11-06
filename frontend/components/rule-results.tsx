import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, MinusCircle } from "lucide-react";
import { RuleResult } from "@/lib/api";
import { cn } from "@/lib/utils";

interface RuleResultsProps {
  ruleResults: RuleResult[];
}

export function RuleResults({ ruleResults }: RuleResultsProps) {
  if (!ruleResults || ruleResults.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Deterministic Rule Audit Log</h3>
          <p className="text-xs text-slate-500">Every financial, policy, and duplicate rule evaluated</p>
        </div>
        <span className="text-xs font-mono font-medium text-slate-500">
          {ruleResults.filter((r) => r.status === "PASS").length} / {ruleResults.length} Passed
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {ruleResults.map((r) => {
          let Icon = CheckCircle2;
          let iconColor = "text-emerald-600";
          let badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";

          if (r.status === "FAIL") {
            if (r.severity === "BLOCK") {
              Icon = XCircle;
              iconColor = "text-rose-600";
              badgeStyle = "bg-rose-50 text-rose-700 border-rose-200 font-semibold";
            } else {
              Icon = AlertTriangle;
              iconColor = "text-amber-600";
              badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
            }
          } else if (r.status === "WARNING") {
            Icon = AlertTriangle;
            iconColor = "text-amber-500";
            badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
          } else if (r.status === "NOT_APPLICABLE") {
            Icon = MinusCircle;
            iconColor = "text-slate-400";
            badgeStyle = "bg-slate-50 text-slate-500 border-slate-200";
          }

          return (
            <div key={r.id || r.rule_id} className="py-3 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", iconColor)} />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-700">{r.rule_id}</span>
                    <span className="text-sm font-medium text-slate-900">{r.rule_name}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">{r.message}</p>

                  {r.status === "FAIL" && Boolean(r.actual_value || r.expected_value) && (
                    <div className="text-[11px] font-mono text-slate-500 mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                      <div>Actual: <span className="text-rose-700 font-semibold">{String(r.actual_value)}</span></div>
                      <div>Expected: <span className="text-slate-700">{String(r.expected_value)}</span></div>
                    </div>
                  )}
                </div>
              </div>

              <span className={cn("px-2 py-0.5 rounded text-[11px] font-mono border shrink-0", badgeStyle)}>
                {r.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
