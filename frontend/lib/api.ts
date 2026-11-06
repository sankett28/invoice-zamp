const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Vendor {
  id: string;
  vendor_code: string;
  legal_name: string;
  tax_id: string | null;
  status: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  currency: string;
  po_total: string;
  po_date: string;
  status: string;
  description: string | null;
  remaining_balance?: string | null;
  vendor?: Vendor | null;
}

export interface RunStage {
  id: string;
  stage_key: string;
  display_name: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED" | "NEEDS_ATTENTION";
  sequence: number;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  summary: string | null;
  details: Record<string, unknown> | null;
}

export interface RuleResult {
  id: string;
  rule_id: string;
  rule_name: string;
  status: "PASS" | "FAIL" | "WARNING" | "NOT_APPLICABLE";
  severity: "INFO" | "REVIEW" | "BLOCK";
  actual_value: unknown;
  expected_value: unknown;
  message: string;
}

export interface InvoiceDecision {
  id: string;
  status: "READY_FOR_AP_APPROVAL" | "REVIEW_REQUIRED" | "BLOCKED";
  reason_codes: string[];
  summary: string;
  recommended_action: string;
  created_at: string;
}

export interface ReviewEvent {
  id: string;
  action: "CONFIRM" | "RETURN" | "REJECT" | "ASSIGN_PO";
  reviewer_label: string;
  reason: string;
  metadata_?: Record<string, unknown> | null;
  created_at: string;
}

export interface RunSummary {
  id: string;
  original_filename: string;
  processing_state: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  decision_status: "READY_FOR_AP_APPROVAL" | "REVIEW_REQUIRED" | "BLOCKED" | null;
  invoice_number: string | null;
  invoice_date: string | null;
  currency: string | null;
  grand_total: string | null;
  decision_summary: string | null;
  created_at: string;
  completed_at: string | null;
  vendor?: Vendor | null;
  purchase_order?: PurchaseOrder | null;
}

export interface RunDetail extends RunSummary {
  file_sha256: string;
  file_size_bytes: number;
  extracted_data: Record<string, unknown> | null;
  stages: RunStage[];
  rule_results: RuleResult[];
  decision: InvoiceDecision | null;
  review_events: ReviewEvent[];
}

export interface UploadResponse {
  run_id: string;
  original_filename?: string;
  processing_state: string;
  message: string;
}

export const api = {
  async uploadInvoice(file: File): Promise<UploadResponse> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/api/invoices`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to upload invoice.");
    }
    return res.json();
  },

  async uploadBatch(files: File[]): Promise<{ total_files: number; successful_queued: number; runs: UploadResponse[]; errors: { filename: string; error: string }[] }> {
    const form = new FormData();
    for (const file of files) {
      form.append("files", file);
    }
    const res = await fetch(`${API_BASE}/api/invoices/batch`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to upload batch.");
    }
    return res.json();
  },

  getExportUrl(format: "csv" | "json" = "csv", status?: string): string {
    const params = new URLSearchParams({ format });
    if (status && status !== "ALL") params.set("status", status);
    return `${API_BASE}/api/runs/export?${params.toString()}`;
  },

  async listRuns(status?: string, limit = 50, offset = 0): Promise<RunSummary[]> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (status && status !== "ALL") params.set("status", status);
    const res = await fetch(`${API_BASE}/api/runs?${params}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch runs.");
    return res.json();
  },

  async getRun(runId: string): Promise<RunDetail> {
    const res = await fetch(`${API_BASE}/api/runs/${runId}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch run details.");
    return res.json();
  },

  async submitReview(
    runId: string,
    data: { action: string; reviewer_label: string; reason: string; assigned_po_id?: string }
  ): Promise<ReviewEvent> {
    const res = await fetch(`${API_BASE}/api/runs/${runId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to submit review.");
    }
    return res.json();
  },

  async listVendors(): Promise<Vendor[]> {
    const res = await fetch(`${API_BASE}/api/vendors`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch vendors.");
    return res.json();
  },

  async listPurchaseOrders(vendorId?: string, status?: string): Promise<PurchaseOrder[]> {
    const params = new URLSearchParams();
    if (vendorId) params.set("vendor_id", vendorId);
    if (status) params.set("status", status);
    const res = await fetch(`${API_BASE}/api/purchase-orders?${params}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch purchase orders.");
    return res.json();
  },

  getFileUrl(runId: string): string {
    return `${API_BASE}/api/runs/${runId}/file`;
  },
};
