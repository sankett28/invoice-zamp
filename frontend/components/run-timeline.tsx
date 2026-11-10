import React from "react";
import { CheckCircle, WarningCircle, Warning, SpinnerGap, MinusCircle, Circle } from "@phosphor-icons/react";
import { RunStage } from "@/lib/api";
import { formatDuration, cn } from "@/lib/utils";

interface RunTimelineProps {
  stages: RunStage[];
  processingState: string;
}

export function RunTimeline({ stages, processingState }: RunTimelineProps) {
  const sortedStages = [...stages].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs transition-colors">
      <div className="flex items-center justify-between pb-3.5 border-b border-border mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground leading-tight">
            Processing Pipeline
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live 13-stage deterministic execution trace
          </p>
        </div>
        {processingState === "PROCESSING" && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary/30 text-secondary-foreground border border-secondary/40">
            <SpinnerGap size={13} weight="bold" className="animate-spin" />
            Active
          </span>
        )}
      </div>

      <div className="relative pl-6 space-y-4">
        {/* Continuous vertical timeline connector line */}
        <div className="absolute left-[17px] top-3 bottom-3 w-0.5 bg-border -z-0" />

        {sortedStages.map((stage) => {
          let Icon = Circle;
          let iconColor = "text-muted-foreground";
          let badgeBg = "bg-muted text-muted-foreground border-border";

          switch (stage.status) {
            case "COMPLETED":
              Icon = CheckCircle;
              iconColor = "text-primary";
              badgeBg = "bg-primary/10 text-primary border-primary/20";
              break;
            case "RUNNING":
              Icon = SpinnerGap;
              iconColor = "text-primary animate-spin";
              badgeBg = "bg-secondary/30 text-secondary-foreground border-secondary/40";
              break;
            case "FAILED":
              Icon = WarningCircle;
              iconColor = "text-destructive";
              badgeBg = "bg-destructive/10 text-destructive border-destructive/25";
              break;
            case "NEEDS_ATTENTION":
              Icon = Warning;
              iconColor = "text-secondary-foreground";
              badgeBg = "bg-secondary/30 text-secondary-foreground border-secondary/40";
              break;
            case "SKIPPED":
              Icon = MinusCircle;
              iconColor = "text-muted-foreground";
              badgeBg = "bg-muted text-muted-foreground border-border";
              break;
          }

          return (
            <div key={stage.id} className="relative flex items-start gap-3.5 z-10 group">
              <div className="p-1 rounded-full bg-card shadow-2xs border border-border shrink-0 mt-0.5">
                <Icon size={16} weight={stage.status === "COMPLETED" ? "fill" : "bold"} className={cn("transition-colors", iconColor)} />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {stage.display_name}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      #{stage.sequence}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {stage.duration_ms !== null && stage.duration_ms !== undefined && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {formatDuration(stage.duration_ms)}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border",
                        badgeBg
                      )}
                    >
                      {stage.status}
                    </span>
                  </div>
                </div>

                {stage.summary && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {stage.summary}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
