# LedgerFlow — REST API Specification

This document details all REST endpoints provided by the LedgerFlow FastAPI backend server (`http://127.0.0.1:8000`).

---

## 1. Health & Status

### `GET /api/health`
Returns the operational health and configured provider settings of the instance.

**Response `200 OK`:**
```json
{
  "status": "healthy",
  "service": "LedgerFlow API",
  "version": "1.0.0",
  "storage": "local",
  "llm_primary": "qwen/qwen3.8-27b",
  "llm_fallback": "gemini-3.8-flash"
}
```

---

## 2. Invoices & Ingestion

### `POST /api/invoices`
Uploads a single invoice PDF and queues background processing.

- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file`: Binary PDF file (max 10MB, max 20 pages).

**Response `200 OK`:**
```json
{
  "run_id": "da22bb38-3b52-45b1-aef9-df96968a1911",
  "original_filename": "invoice_happy_path.pdf",
  "processing_state": "QUEUED",
  "message": "Invoice accepted for processing."
}
```

### `POST /api/invoices/batch`
Ingests multiple invoice PDFs or a single `.zip` archive containing invoice documents.

- **Content-Type:** `multipart/form-data`
- **Body:**
  - `files`: One or more binary files (`.pdf` or `.zip`).

**Response `200 OK`:**
```json
{
  "total_files": 2,
  "successful_queued": 2,
  "runs": [
    {
      "run_id": "8455534b-8319-4c30-b920-0768dc48b2a9",
      "original_filename": "inv_001.pdf",
      "processing_state": "QUEUED",
      "message": "Enqueued for processing"
    },
    {
      "run_id": "c108f972-e568-45e8-b803-1250328b9605",
      "original_filename": "inv_002.pdf",
      "processing_state": "QUEUED",
      "message": "Enqueued for processing"
    }
  ],
  "errors": []
}
```

---

## 3. Runs & Pipeline Tracking

### `GET /api/runs`
Lists invoice processing runs with optional status filtering.

- **Query Parameters:**
  - `status` *(string, optional)*: Filter by `processing_state` (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`) or `decision_status` (`READY_FOR_AP_APPROVAL`, `REVIEW_REQUIRED`, `BLOCKED`).
  - `limit` *(integer, default 50)*: Number of records to return.
  - `offset` *(integer, default 0)*: Pagination offset.

**Response `200 OK`:**
```json
[
  {
    "id": "da22bb38-3b52-45b1-aef9-df96968a1911",
    "original_filename": "invoice_happy_path.pdf",
    "processing_state": "COMPLETED",
    "decision_status": "READY_FOR_AP_APPROVAL",
    "vendor_id": "34ec69a7-395f-409f-a404-b44c9540d0fa",
    "purchase_order_id": "1c4c539d-1e9c-40c2-87ec-a5b69dd96432",
    "invoice_number": "AST-2026-041",
    "invoice_date": "2026-10-30",
    "currency": "INR",
    "grand_total": "94400.00",
    "decision_summary": "All required checks passed. The invoice is validated and ready for Accounts Payable approval.",
    "created_at": "2026-11-06T04:52:10.123456",
    "completed_at": "2026-11-06T04:52:11.456789",
    "vendor": {
      "id": "34ec69a7-395f-409f-a404-b44c9540d0fa",
      "vendor_code": "V-001",
      "legal_name": "Aster Office Supplies Pvt Ltd",
      "tax_id": "27ABCDE1234F1Z5",
      "status": "APPROVED"
    },
    "purchase_order": {
      "id": "1c4c539d-1e9c-40c2-87ec-a5b69dd96432",
      "po_number": "PO-1001",
      "po_total": "100000.00",
      "currency": "INR",
      "status": "OPEN",
      "remaining_balance": "5600.00"
    }
  }
]
```

### `GET /api/runs/{run_id}`
Retrieves complete run detail including live stage timeline, all 16 rule results, decision summary, and human review audit trail.

**Response `200 OK`:**
```json
{
  "id": "da22bb38-3b52-45b1-aef9-df96968a1911",
  "original_filename": "invoice_happy_path.pdf",
  "processing_state": "COMPLETED",
  "decision_status": "READY_FOR_AP_APPROVAL",
  "file_sha256": "4f1b4cf0f8d2e22e5ec8ce1fcad4563dc503140ab986b529eeff6c93420c68a8",
  "file_size_bytes": 14205,
  "stages": [
    {
      "stage_key": "file_received",
      "display_name": "File Received",
      "status": "COMPLETED",
      "sequence": 1,
      "duration_ms": 12,
      "summary": "File saved to storage."
    }
  ],
  "rule_results": [
    {
      "rule_id": "R-001",
      "rule_name": "Valid PDF Document",
      "status": "PASS",
      "severity": "BLOCK",
      "actual_value": "1 page(s), 14.2 KB",
      "expected_value": "Valid PDF <= 20 pages and <= 10MB",
      "message": "PDF format and size are valid."
    }
  ],
  "decision": {
    "status": "READY_FOR_AP_APPROVAL",
    "reason_codes": [],
    "summary": "All required checks passed. The invoice is validated and ready for Accounts Payable approval.",
    "recommended_action": "Review and approve in the AP process"
  },
  "review_events": []
}
```

### `GET /api/runs/{run_id}/file`
Streams the original uploaded PDF for viewing in browser iframes or local download.
- **Content-Type:** `application/pdf`
- **Header:** `Content-Disposition: inline; filename="original_name.pdf"`

---

## 4. Auditor Action & ERP Export

### `POST /api/runs/{run_id}/review`
Records a human auditor review decision (Decision D-006).

- **Content-Type:** `application/json`
- **Body:**
```json
{
  "action": "ASSIGN_PO",
  "reviewer_label": "Sanket (AP Lead)",
  "reason": "Verified software maintenance scope with vendor. Assigned to PO-2002.",
  "assigned_po_id": "83c6e467-639d-4805-b267-2878f2d53c86"
}
```

**Actions Supported:**
- `CONFIRM`: Overrides review hold and moves run to `READY_FOR_AP_APPROVAL`.
- `ASSIGN_PO`: Attaches selected PO to the invoice and transitions to `READY_FOR_AP_APPROVAL`.
- `RETURN`: Returns invoice to vendor requesting correction.
- `REJECT`: Marks invoice as `BLOCKED`.

### `GET /api/runs/export`
Exports invoice records formatted for ERP / Accounting ingestion.

- **Query Parameters:**
  - `status` *(string, optional, default: all)*: e.g. `READY_FOR_AP_APPROVAL`.
  - `format` *(string, default: "csv")*: `csv` or `json`.

**Response `200 OK` (when `format=csv`):**
```csv
run_id,invoice_number,invoice_date,vendor_code,vendor_name,tax_id,po_number,currency,grand_total,decision_status,decision_summary,created_at,completed_at
da22bb38-...,AST-2026-041,2026-10-30,V-001,Aster Office Supplies Pvt Ltd,27ABCDE1234F1Z5,PO-1001,INR,94400.00,READY_FOR_AP_APPROVAL,All required checks passed.,2026-11-06T04:52:10,2026-11-06T04:52:11
```
