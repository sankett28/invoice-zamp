import React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Loader2, MinusCircle, Circle } from "lucide-react";
import { RunStage } from "@/lib/api";
import { formatDuration, cn } from "@/lib/utils";

interface RunTimelineProps {
  stages: RunStage[];
  processingState: string;
}

export function RunTimeline({ stages, processingState }: RunTimelineProps) {
  const sortedStages = [...stages].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Processing Pipeline</h3>
          <p className="text-xs text-slate-500">Live 13-stage deterministic execution trace</p>
        </div>
        {processingState === "PROCESSING" && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Active
          </span>
        )}
      </div>

      <div className="relative pl-6 space-y-4">
        {/* Continuous vertical timeline connector line */}
        <div className="absolute left-[17px] top-3 bottom-3 w-0.5 bg-slate-100 -z-0" />

        {sortedStages.map((stage) => {
          let Icon = Circle;
          let iconColor = "text-slate-300";
          let badgeBg = "bg-slate-50";

          switch (stage.status) {
            case "COMPLETED":
              Icon = CheckCircle2;
              iconColor = "text-emerald-600";
              badgeBg = "bg-emerald-50";
              break;
            case "RUNNING":
              Icon = Loader2;
              iconColor = "text-blue-600 animate-spin";
              badgeBg = "bg-blue-50";
              break;
            case "FAILED":
              Icon = AlertCircle;
              iconColor = "text-rose-600";
              badgeBg = "bg-rose-50";
              break;
            case "NEEDS_ATTENTION":
              Icon = AlertTriangle;
              iconColor = "text-amber-500";
              badgeBg = "bg-amber-50";
              break;
            case "SKIPPED":
              Icon = MinusCircle;
              iconColor = "text-slate-400";
              badgeBg = "bg-slate-50";
              break;
            case "PENDING":
            default:
              Icon = Circle;
              iconColor = "text-slate-300";
              badgeBg = "bg-white";
              break;
          }

          return (
            <div key={stage.id || stage.stage_key} className="relative flex items-start justify-between gap-4 z-10">
              <div className="flex items-start gap-3">
                <div className={cn("p-0.5 rounded-full bg-white mt-0.5", badgeBg)}>
                  <Icon className={cn("w-4 h-4 shrink-0", iconColor)} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        stage.status === "COMPLETED" ? "text-slate-900" : stage.status === "RUNNING" ? "text-blue-900 font-semibold" : "text-slate-600"
                      )}
                    >
                      {stage.display_name}
                    </span>
                    {stage.status === "NEEDS_ATTENTION" && (
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        Attention
                      </span>
                    )}
                    {stage.status === "SKIPPED" && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                        Bypassed
                      </span>
                    )}
                  </div>
                  {stage.summary && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-mono text-[11px]">
                      {stage.summary}
                    </p>
                  )}
                </div>
              </div>

              {stage.duration_ms !== null && stage.duration_ms !== undefined && (
                <span className="text-[11px] font-mono text-slate-400 shrink-0">
                  {formatDuration(stage.duration_ms)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
