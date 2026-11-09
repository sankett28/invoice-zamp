import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  } catch {
    return dateStr;
  }
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export const STATUS_CONFIG = {
  READY_FOR_AP_APPROVAL: {
    label: "Ready for AP Approval",
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/25",
    dot: "bg-primary",
  },
  REVIEW_REQUIRED: {
    label: "Review Required",
    bg: "bg-status-negotiation/15",
    text: "text-foreground",
    border: "border-status-negotiation/30",
    dot: "bg-status-negotiation",
  },
  BLOCKED: {
    label: "Blocked",
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/25",
    dot: "bg-destructive",
  },
  QUEUED: {
    label: "Queued",
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    dot: "bg-muted-foreground",
  },
  PROCESSING: {
    label: "Processing",
    bg: "bg-secondary/25",
    text: "text-secondary-foreground",
    border: "border-secondary/40",
    dot: "bg-primary animate-pulse",
  },
  COMPLETED: {
    label: "Completed",
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/25",
    dot: "bg-primary",
  },
  FAILED: {
    label: "Failed",
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/25",
    dot: "bg-destructive",
  },
} as const;
