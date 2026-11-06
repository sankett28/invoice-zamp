"use client";

import React, { useState } from "react";
import { UserCheck, Send, CheckCircle2, History } from "lucide-react";
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
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        <UserCheck className="w-4 h-4 text-slate-700" />
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Human Review & Exception Resolution</h3>
          <p className="text-xs text-slate-500">Record reviewer audit decision and override instructions</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        {error && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Resolution Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="CONFIRM">Confirm & Advance to AP Approval</option>
              <option value="RETURN">Return to Vendor for Missing Data</option>
              <option value="REJECT">Reject / Block Transaction</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Reviewer Identity</label>
            <input
              type="text"
              value={reviewerLabel}
              onChange={(e) => setReviewerLabel(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              placeholder="e.g. Senior AP Reviewer"
            />
          </div>
        </div>

        {candidatePOs.length > 0 && (
          <div>
            <label className="block font-medium text-slate-700 mb-1">Assign Purchase Order (Optional)</label>
            <select
              value={assignedPoId}
              onChange={(e) => setAssignedPoId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="">-- Keep Current / Unassigned --</option>
              {candidatePOs.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.po_number} (Total: ₹{po.po_total} - {po.status})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Mandatory Reviewer Note & Business Justification
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            placeholder="Explain why this exception is accepted, returned, or rejected for audit records..."
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 disabled:opacity-50 transition shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isSubmitting ? "Recording Audit Event..." : "Submit Review Resolution"}</span>
        </button>
      </form>

      {/* Historical Audit Trail of Reviews */}
      {existingEvents && existingEvents.length > 0 && (
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Audit Trail History</span>
          </div>

          <div className="space-y-1.5">
            {existingEvents.map((ev) => (
              <div key={ev.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span className="font-mono text-emerald-700">{ev.action}</span>
                  <span className="text-[10px] text-slate-400 font-normal">{formatDateTime(ev.created_at)}</span>
                </div>
                <p className="text-slate-600 mt-1 italic">"{ev.reason}"</p>
                <div className="text-[10px] text-slate-400 mt-1">Reviewer: {ev.reviewer_label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
