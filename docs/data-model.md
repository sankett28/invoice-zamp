# LedgerFlow — Data Model

**Status:** Locked before implementation  
**Database:** PostgreSQL  
**ORM:** SQLAlchemy (async) with Alembic migrations  
**All monetary values:** `NUMERIC(15, 2)` — never `FLOAT`  
**All IDs:** UUID v4

---

## Table: `vendors`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default gen_random_uuid() | |
| `vendor_code` | VARCHAR(50) | UNIQUE, NOT NULL | e.g. `V-001` |
| `legal_name` | VARCHAR(255) | NOT NULL | Registered vendor name |
| `normalised_name` | VARCHAR(255) | NOT NULL | Lowercase, stripped for matching |
| `tax_id` | VARCHAR(50) | NULLABLE, UNIQUE | GST/tax ID; unique when present |
| `status` | VARCHAR(20) | NOT NULL | `APPROVED` / `INACTIVE` / `UNAPPROVED` |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() | |

**Indexes:** `vendor_code` (unique), `normalised_name` (btree), `tax_id` (unique partial where not null)

**Seed data (5 vendors):**

| vendor_code | legal_name | status |
|---|---|---|
| V-001 | Aster Office Supplies Pvt Ltd | APPROVED |
| V-002 | Northstar IT Services Pvt Ltd | APPROVED |
| V-003 | BluePeak Logistics Pvt Ltd | APPROVED |
| V-004 | OldTown Stationery | INACTIVE |
| V-005 | Metro Components | UNAPPROVED |

---

## Table: `purchase_orders`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `po_number` | VARCHAR(50) | UNIQUE, NOT NULL | e.g. `PO-1001` |
| `vendor_id` | UUID | FK → vendors.id, NOT NULL | |
| `currency` | VARCHAR(10) | NOT NULL, default `INR` | |
| `po_total` | NUMERIC(15,2) | NOT NULL | Approved PO value |
| `po_date` | DATE | NOT NULL | |
| `status` | VARCHAR(30) | NOT NULL | `OPEN` / `PARTIALLY_INVOICED` / `CLOSED` / `CANCELLED` |
| `description` | TEXT | NULLABLE | PO description for candidate matching |
| `line_items` | JSONB | NULLABLE | Optional simplified line-item list |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() | |

**Indexes:** `po_number` (unique), `vendor_id` (btree), `status` (btree)

**Seed data (8 POs):**

| po_number | vendor | po_total | status | Purpose |
|---|---|---|---|---|
| PO-1001 | V-001 | ₹1,00,000 | OPEN | Happy path |
| PO-2001 | V-002 | ₹1,00,000 | OPEN | Split PO (EC-2) part 1 |
| PO-2002 | V-002 | ₹80,000 | OPEN | Ambiguous PO (EC-3) candidate 1 |
| PO-2003 | V-002 | ₹75,000 | OPEN | Ambiguous PO (EC-3) candidate 2 |
| PO-3001 | V-003 | ₹50,000 | OPEN | General use |
| PO-4001 | V-001 | ₹30,000 | CLOSED | Closed PO test |
| PO-5001 | V-001 | ₹60,000 | CANCELLED | Cancelled PO test |
| PO-6001 | V-003 | ₹45,000 | OPEN | Vendor mismatch test (use with V-001 invoice) |

---

## Table: `invoice_runs`

One row per uploaded processing attempt.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | Run ID shown in UI |
| `original_filename` | VARCHAR(255) | NOT NULL | Sanitised uploaded filename |
| `file_storage_path` | VARCHAR(500) | NOT NULL | Storage key / path |
| `file_sha256` | VARCHAR(64) | NOT NULL | For exact duplicate detection |
| `file_size_bytes` | INTEGER | NOT NULL | |
| `processing_state` | VARCHAR(20) | NOT NULL | `QUEUED` / `PROCESSING` / `COMPLETED` / `FAILED` |
| `decision_status` | VARCHAR(30) | NULLABLE | `READY_FOR_AP_APPROVAL` / `REVIEW_REQUIRED` / `BLOCKED` |
| `vendor_id` | UUID | FK → vendors.id, NULLABLE | Matched vendor |
| `purchase_order_id` | UUID | FK → purchase_orders.id, NULLABLE | Confirmed PO |
| `invoice_number` | VARCHAR(255) | NULLABLE | Extracted invoice number (original) |
| `invoice_number_normalised` | VARCHAR(255) | NULLABLE | Normalised for duplicate lookup |
| `invoice_date` | DATE | NULLABLE | |
| `currency` | VARCHAR(10) | NULLABLE | |
| `grand_total` | NUMERIC(15,2) | NULLABLE | |
| `extracted_data` | JSONB | NULLABLE | Full `InvoiceExtractionResult` JSON |
| `decision_summary` | TEXT | NULLABLE | Human-readable result summary |
| `created_at` | TIMESTAMPTZ | NOT NULL | Upload timestamp |
| `completed_at` | TIMESTAMPTZ | NULLABLE | |

**Indexes:** `file_sha256` (btree), `(vendor_id, invoice_number_normalised)` (btree, for business-key dup check), `processing_state` (btree), `decision_status` (btree), `created_at DESC`

---

## Table: `run_stages`

One row per workflow stage per run.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `run_id` | UUID | FK → invoice_runs.id, NOT NULL | |
| `stage_key` | VARCHAR(50) | NOT NULL | Stable identifier e.g. `pdf_extraction` |
| `display_name` | VARCHAR(100) | NOT NULL | e.g. `PDF Text Extraction` |
| `status` | VARCHAR(20) | NOT NULL | `PENDING` / `RUNNING` / `COMPLETED` / `FAILED` / `SKIPPED` / `NEEDS_ATTENTION` |
| `sequence` | INTEGER | NOT NULL | Display order (1-based) |
| `started_at` | TIMESTAMPTZ | NULLABLE | |
| `completed_at` | TIMESTAMPTZ | NULLABLE | |
| `duration_ms` | INTEGER | NULLABLE | |
| `summary` | TEXT | NULLABLE | Safe UI-facing summary |
| `details` | JSONB | NULLABLE | Stage-specific data and errors |

**Stage keys and sequence:**

| seq | stage_key | display_name |
|---|---|---|
| 1 | `file_received` | File Received |
| 2 | `file_validation` | PDF Validated |
| 3 | `duplicate_check_exact` | Exact Duplicate Check |
| 4 | `text_extraction` | Text Extraction |
| 5 | `ocr_fallback` | OCR / Vision Fallback |
| 6 | `llm_extraction` | AI Field Extraction |
| 7 | `extraction_validation` | Extraction Validation |
| 8 | `vendor_validation` | Vendor Validation |
| 9 | `po_matching` | PO Matching |
| 10 | `duplicate_check_business` | Business Duplicate Check |
| 11 | `financial_reconciliation` | Financial Reconciliation |
| 12 | `po_balance_check` | PO Balance Check |
| 13 | `decision_engine` | Decision Generated |

---

## Table: `rule_results`

One row per rule evaluated per run.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `run_id` | UUID | FK → invoice_runs.id, NOT NULL | |
| `rule_id` | VARCHAR(10) | NOT NULL | e.g. `R-013` |
| `rule_name` | VARCHAR(100) | NOT NULL | Human-readable |
| `status` | VARCHAR(20) | NOT NULL | `PASS` / `FAIL` / `WARNING` / `NOT_APPLICABLE` |
| `severity` | VARCHAR(10) | NOT NULL | `INFO` / `REVIEW` / `BLOCK` |
| `actual_value` | JSONB | NULLABLE | Observed value(s) |
| `expected_value` | JSONB | NULLABLE | Expected value / policy |
| `message` | TEXT | NOT NULL | Explanation for reviewer |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

---

## Table: `invoice_decisions`

One row per run (the automated decision).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `run_id` | UUID | FK → invoice_runs.id, UNIQUE, NOT NULL | One decision per run |
| `status` | VARCHAR(30) | NOT NULL | `READY_FOR_AP_APPROVAL` / `REVIEW_REQUIRED` / `BLOCKED` |
| `reason_codes` | JSONB | NOT NULL | List of triggered rule IDs and severities |
| `summary` | TEXT | NOT NULL | Human-readable explanation |
| `recommended_action` | VARCHAR(255) | NOT NULL | Next step for AP operator |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

---

## Table: `review_events`

One row per reviewer action (append-only).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `run_id` | UUID | FK → invoice_runs.id, NOT NULL | |
| `action` | VARCHAR(30) | NOT NULL | `CONFIRM` / `RETURN` / `REJECT` / `ASSIGN_PO` |
| `reviewer_label` | VARCHAR(100) | NOT NULL | Demo label (real auth is out of scope) |
| `reason` | TEXT | NOT NULL | Mandatory reviewer note |
| `metadata` | JSONB | NULLABLE | e.g. `{"assigned_po_id": "..."}` for ASSIGN_PO |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

---

## PO Consumption Query

```sql
-- Remaining balance for a given PO, excluding the current run
SELECT
  po.po_total -
  COALESCE(SUM(ir.grand_total), 0) AS remaining_po_amount
FROM purchase_orders po
LEFT JOIN invoice_runs ir
  ON ir.purchase_order_id = po.id
  AND ir.decision_status = 'READY_FOR_AP_APPROVAL'
  AND ir.id != :current_run_id   -- exclude the run being evaluated
WHERE po.id = :po_id
GROUP BY po.po_total;
```

**Policy:** An invoice run is counted against the PO balance when `decision_status = 'READY_FOR_AP_APPROVAL'` (Decision D-002, Option C). Blocked and failed runs do not consume PO balance. This query must run inside a transaction during the balance check stage.

---

## Entity Relationships

```
vendors
  └── purchase_orders (vendor_id)
  └── invoice_runs    (vendor_id)

purchase_orders
  └── invoice_runs (purchase_order_id)

invoice_runs
  └── run_stages        (run_id)
  └── rule_results      (run_id)
  └── invoice_decisions (run_id, 1:1)
  └── review_events     (run_id, 1:many)
```
