import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string | null | undefined;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  let label = "Pending";
  let dotColor = "bg-muted-foreground";
  let badgeClasses = "bg-muted text-muted-foreground border-border";

  switch (status) {
    case "READY_FOR_AP_APPROVAL":
    case "COMPLETED":
      label = "Ready for approval";
      dotColor = "bg-primary";
      badgeClasses = "bg-primary/10 text-primary border-primary/20";
      break;

    case "REVIEW_REQUIRED":
      label = "Review required";
      dotColor = "bg-[oklch(0.62_0.14_75)]";
      badgeClasses = "bg-secondary/30 text-secondary-foreground border-secondary/40";
      break;

    case "BLOCKED":
    case "FAILED":
      label = "Blocked";
      dotColor = "bg-destructive";
      badgeClasses = "bg-destructive/10 text-destructive border-destructive/25";
      break;

    case "PROCESSING":
    case "QUEUED":
      label = "Processing";
      dotColor = "bg-primary animate-pulse";
      badgeClasses = "bg-muted text-muted-foreground border-border";
      break;

    default:
      if (status) {
        label = status.replace(/_/g, " ").toLowerCase();
        label = label.charAt(0).toUpperCase() + label.slice(1);
      }
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-2xs transition-colors",
        badgeClasses,
        className
      )}
    >
      {showDot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />}
      <span>{label}</span>
    </span>
  );
}
