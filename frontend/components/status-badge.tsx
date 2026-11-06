import React from "react";
import { STATUS_CONFIG, cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string | null | undefined;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  if (!status) {
    return (
      <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600", className)}>
        Pending
      </span>
    );
  }

  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
    label: status.replace(/_/g, " "),
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      {showDot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dot)} />}
      {config.label}
    </span>
  );
}
