"use client";

import React, { useState } from "react";
import { UserCheck, PaperPlaneRight, ClockCounterClockwise, WarningCircle } from "@phosphor-icons/react";
import { api, ReviewEvent, PurchaseOrder } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

interface ReviewFormProps {
  runId: string;
  existingEvents: ReviewEvent[];
  candidatePOs?: PurchaseOrder[];
  onReviewSubmitted: () => void;
}

export function ReviewForm({ runId, existingEvents, candidatePOs = [], onReviewSubmitted }: ReviewFormProps) {
  const [action, setAction] = useState<string>("CONFIRM");
  const [reviewerLabel, setReviewerLabel] = useState<string>("AP Specialist");
  const [reason, setReason] = useState<string>("");
  const [assignedPoId, setAssignedPoId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("A detailed reviewer explanation is required to resolve this state.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await api.submitReview(runId, {
        action,
        reviewer_label: reviewerLabel,
        reason: reason.trim(),
        assigned_po_id: assignedPoId || undefined,
      });
      setReason("");
      onReviewSubmitted();
    } catch (err: any) {
      setError(err?.message || "Failed to submit review resolution.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
      <div className="flex items-center gap-2.5 pb-3.5 border-b border-border">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <UserCheck size={18} weight="bold" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground leading-tight">
            Human Review &amp; Exception Resolution
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record reviewer audit decision and override instructions
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive flex items-start gap-2">
            <WarningCircle size={16} weight="fill" className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-muted-foreground font-medium mb-1 uppercase text-[10px] tracking-wide">
              Resolution Action
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-background text-foreground font-medium focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="CONFIRM">Approve &amp; Confirm (Release to AP)</option>
              <option value="REJECT">Reject &amp; Cancel Invoice</option>
              <option value="REQUEST_VENDOR_INFO">Request Vendor Clarification</option>
            </select>
          </div>

          <div>
            <label className="block text-muted-foreground font-medium mb-1 uppercase text-[10px] tracking-wide">
              Reviewer Identity
            </label>
            <input
              type="text"
              value={reviewerLabel}
              onChange={(e) => setReviewerLabel(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-background text-foreground font-medium focus:outline-hidden focus:ring-1 focus:ring-primary"
              placeholder="e.g. Lead AP Auditor"
            />
          </div>
        </div>

        {candidatePOs.length > 0 && (
          <div>
            <label className="block text-muted-foreground font-medium mb-1 uppercase text-[10px] tracking-wide">
              Assign Verified Purchase Order
            </label>
            <select
              value={assignedPoId}
              onChange={(e) => setAssignedPoId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-background text-foreground font-medium focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="">Keep Existing / Leave Unchanged</option>
              {candidatePOs.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.po_number} — Total: {po.po_total}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-muted-foreground font-medium mb-1 uppercase text-[10px] tracking-wide">
            Mandatory Auditor Audit Justification
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Document why this exception is approved or rejected for durable ERP audit trail..."
            className="w-full p-3 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary leading-relaxed"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs disabled:opacity-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <PaperPlaneRight size={14} weight="bold" />
          <span>{isSubmitting ? "Submitting Resolution..." : "Commit Review Decision"}</span>
        </button>
      </form>

      {/* Existing Review Events History */}
      {existingEvents && existingEvents.length > 0 && (
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-[11px] uppercase tracking-wide">
            <ClockCounterClockwise size={14} weight="bold" />
            <span>Auditor Event Trail ({existingEvents.length})</span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {existingEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-3 rounded-xl bg-background border border-border text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    {ev.reviewer_label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDateTime(ev.created_at)}
                  </span>
                </div>
                <div className="text-[11px] font-mono font-medium text-primary">
                  Action: {ev.action}
                </div>
                <p className="text-foreground/80 text-[11px] italic">
                  &ldquo;{ev.reason}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
