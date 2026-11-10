# LedgerFlow — REST API Specification

**Version:** 2.0  
**Status:** Implemented & Verified  
**Base URL:** `http://127.0.0.1:8000`

---

## 1. Health & Status

### `GET /api/health`
Returns the operational health, storage backend, and configured LLM models.

**Cache Policy:** Direct Passthrough (No cache)

**Response `200 OK`:**
```json
{
  "status": "healthy",
  "service": "LedgerFlow API",
  "version": "1.0.0",
  "storage": "supabase",
  "llm_primary": "gemini-3.5-flash-lite",
  "llm_fallback": "gemini-3.5-flash-lite"
}
```

---

## 2. Invoices & Ingestion

### `POST /api/invoices`
Uploads a single invoice PDF, saves the file to Supabase Storage, creates `invoice_runs` and `run_stages` rows, invalidates the runs/pos cache, and enqueues background processing.

- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file`: Binary PDF file (max 10MB, max 20 pages).
- **Cache Invalidation:** Purges `runs:*` and `pos:*` in-memory cache.

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
Ingests multiple invoice PDFs or a single `.zip` archive containing invoices.

- **Content-Type:** `multipart/form-data`
- **Body:**
  - `files`: One or more binary files (`.pdf` or `.zip`).
- **Cache Invalidation:** Purges `runs:*` and `pos:*` in-memory cache.

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

## 3. Invoice Runs & Inspection

### `GET /api/runs`
Lists invoice processing runs with optional status filtering and pagination.

- **Query Parameters:**
  - `status` *(string, optional)*: Filter by `processing_state` (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`) or `decision_status` (`READY_FOR_AP_APPROVAL`, `REVIEW_REQUIRED`, `BLOCKED`).
  - `limit` *(integer, default 50)*: Number of records to return.
  - `offset` *(integer, default 0)*: Pagination offset.
- **Cache Policy:** In-Memory TTL Cache (10 seconds, key: `runs:list:{status}:{limit}:{offset}`).

**Response `200 OK`:**
```json
[
  {
    "id": "e1200538-0622-498a-8b0c-4a9812466dca",
    "original_filename": "01_happy_path_clean.pdf",
    "processing_state": "COMPLETED",
    "decision_status": "READY_FOR_AP_APPROVAL",
    "vendor_id": "34ec69a7-395f-409f-a404-b44c9540d0fa",
    "purchase_order_id": "1c4c539d-1e9c-40c2-87ec-a5b69dd96432",
    "invoice_number": "AST-2026-041",
    "invoice_date": "2026-10-30",
    "currency": "INR",
    "grand_total": "94400.00",
    "decision_summary": "Aster Office Supplies Pvt Ltd submitted invoice AST-2026-041 for INR 94400.00, matching purchase order PO-1001...",
    "created_at": "2026-11-09T09:20:00.000000Z",
    "completed_at": "2026-11-09T09:20:02.100000Z",
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
Retrieves full run detail including live stage timeline, all 16 rule results, decision status, natural-language `ai_summary`, and human review event history.

- **Cache Policy:** In-Memory TTL Cache (60 seconds for `COMPLETED` or `FAILED` runs, key: `runs:detail:{run_id}`).
- **Zero LLM Guarantee:** This endpoint reads persisted data and never calls external LLM endpoints.

**Response `200 OK`:**
```json
{
  "id": "e1200538-0622-498a-8b0c-4a9812466dca",
  "original_filename": "01_happy_path_clean.pdf",
  "processing_state": "COMPLETED",
  "decision_status": "READY_FOR_AP_APPROVAL",
  "file_sha256": "fe3493677f...",
  "file_size_bytes": 45056,
  "ai_summary": "Aster Office Supplies Pvt Ltd submitted invoice AST-2026-041 for INR 94400.00, matching purchase order PO-1001. This invoice consumes budget as expected of the INR 100000.00 allocated budget, leaving INR 5600.00 available in remaining funds. All 16 automated audit checks passed cleanly: GST and line calculations are mathematically exact, the document fingerprint is unique with zero duplicate risk, and no suspicious anomalies were detected. This invoice is verified and clear for immediate Accounts Payable approval.",
  "decision_summary": "Aster Office Supplies Pvt Ltd submitted invoice AST-2026-041...",
  "extracted_data": {
    "vendor": {
      "name": "Aster Office Supplies Pvt Ltd",
      "tax_id": "27ABCDE1234F1Z5"
    },
    "invoice": {
      "number": "AST-2026-041",
      "date": "2026-10-30",
      "po_number": "PO-1001"
    },
    "amounts": {
      "subtotal": "80000.00",
      "tax_total": "14400.00",
      "grand_total": "94400.00"
    },
    "line_items": [
      {
        "description": "Executive Chairs",
        "quantity": "20",
        "unit_price": "4000.00",
        "line_total": "80000.00"
      }
    ]
  },
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
      "actual_value": "1 page(s), 44.0 KB",
      "expected_value": "Valid PDF <= 20 pages and <= 10MB",
      "message": "File format, signature, and size constraints verified."
    }
  ],
  "decision": {
    "status": "READY_FOR_AP_APPROVAL",
    "reason_codes": [],
    "summary": "Aster Office Supplies Pvt Ltd submitted invoice AST-2026-041...",
    "recommended_action": "Proceed with final AP sign-off."
  },
  "review_events": []
}
```

### `GET /api/runs/{run_id}/file`
Streams the original PDF for viewing in browser iframes or downloading.

- **Content-Type:** `application/pdf`
- **Header:** `Content-Disposition: inline; filename="original_filename.pdf"`

---

## 4. Auditor Actions & ERP Export

### `POST /api/runs/{run_id}/review`
Records a human review event and resolution (Decision D-006).

- **Content-Type:** `application/json`
- **Body:**
```json
{
  "action": "ASSIGN_PO",
  "reviewer_label": "AP Specialist",
  "reason": "Confirmed against PO PO-1001 after verifying packing slip.",
  "assigned_po_id": "1c4c539d-1e9c-40c2-87ec-a5b69dd96432"
}
```
- **Allowed Actions:** `CONFIRM`, `ASSIGN_PO`, `REQUEST_VENDOR_INFO`, `REJECT`.
- **Cache Invalidation:** Automatically purges `runs:*` and `pos:*` cache entries.

**Response `200 OK`:**
```json
{
  "id": "7b58bb43-e189-4bc2-8924-f18c642e1da4",
  "run_id": "e1200538-0622-498a-8b0c-4a9812466dca",
  "action": "ASSIGN_PO",
  "reviewer_label": "AP Specialist",
  "reason": "Confirmed against PO PO-1001 after verifying packing slip.",
  "metadata_": {
    "assigned_po_number": "PO-1001"
  },
  "created_at": "2026-11-09T09:45:00.000000Z"
}
```

### `GET /api/runs/export`
Exports processed invoices in accounting-ready CSV or JSON formats for ERP ingestion.

- **Query Parameters:**
  - `format` *(string, default "csv")*: `csv` or `json`.
  - `status` *(string, optional)*: Filter by `decision_status`.

**Response `200 OK` (CSV):**
```csv
run_id,invoice_number,invoice_date,vendor_code,vendor_name,tax_id,po_number,currency,grand_total,decision_status,decision_summary,created_at,completed_at
e1200538-0622...,AST-2026-041,2026-10-30,V-001,Aster Office Supplies Pvt Ltd,27ABCDE1234F1Z5,PO-1001,INR,94400.00,READY_FOR_AP_APPROVAL,"...",2026-11-09T09:20:00Z,2026-11-09T09:20:02Z
```

---

## 5. Master Data Endpoints

### `GET /api/vendors`
Lists approved and inactive vendors in the vendor master registry.

- **Cache Policy:** In-Memory TTL Cache (120 seconds, key: `vendors:all`).
- **Response Time:** < 5 ms when cached.

**Response `200 OK`:**
```json
[
  {
    "id": "34ec69a7-395f-409f-a404-b44c9540d0fa",
    "vendor_code": "V-001",
    "legal_name": "Aster Office Supplies Pvt Ltd",
    "tax_id": "27ABCDE1234F1Z5",
    "status": "APPROVED"
  }
]
```

### `GET /api/purchase-orders`
Lists purchase orders with real-time remaining balances calculated via a single batched SQL aggregation query.

- **Query Parameters:**
  - `vendor_id` *(UUID, optional)*: Filter POs by vendor.
  - `status` *(string, optional)*: Filter by PO status (`OPEN`, `PARTIALLY_INVOICED`, `CLOSED`, `CANCELLED`).
- **Cache Policy:** In-Memory TTL Cache (60 seconds, key: `pos:{vendor_id}:{status}`).
- **Performance Guarantee:** Zero N+1 queries. Responses served in < 5 ms from memory cache.

**Response `200 OK`:**
```json
[
  {
    "id": "1c4c539d-1e9c-40c2-87ec-a5b69dd96432",
    "po_number": "PO-1001",
    "vendor_id": "34ec69a7-395f-409f-a404-b44c9540d0fa",
    "currency": "INR",
    "po_total": "100000.00",
    "po_date": "2026-10-01",
    "status": "OPEN",
    "description": "Office furniture and supplies Q4 2026",
    "line_items": [
      {
        "item_name": "Executive Chairs",
        "quantity": 20,
        "unit_price": "4000.00"
      }
    ],
    "remaining_balance": "5600.00",
    "vendor": {
      "id": "34ec69a7-395f-409f-a404-b44c9540d0fa",
      "vendor_code": "V-001",
      "legal_name": "Aster Office Supplies Pvt Ltd",
      "tax_id": "27ABCDE1234F1Z5",
      "status": "APPROVED"
    }
  }
]
```
