# LedgerFlow — Business Rules Catalogue

**Status:** Locked before implementation  
**Decision engine:** Deterministic application code only. The LLM never evaluates rules.  
**Priority order:** BLOCKED > REVIEW_REQUIRED > READY_FOR_AP_APPROVAL  
**Behaviour:** All applicable rules run. The highest-severity outcome wins. All failures are preserved and shown in the decision report — not just the first one.

---

## Rule Priority Reference

```
1. Any BLOCK rule fails         → BLOCKED  (stops here)
2. No BLOCK, any REVIEW fails   → REVIEW_REQUIRED
3. All required rules pass      → READY_FOR_AP_APPROVAL
```

---

## Rules — File and Input Validation

### R-001 — Valid PDF

| Field | Value |
|---|---|
| **Stage** | File validation (Stage 2) |
| **Checks** | File extension is `.pdf`; MIME type / magic bytes confirm PDF; file can be opened by PyMuPDF; size ≤ `MAX_FILE_SIZE_MB`; page count ≤ `MAX_PAGE_COUNT` |
| **Pass condition** | All checks pass |
| **Failure severity** | `BLOCK` |
| **Failure outcome** | `BLOCKED` — invalid input |
| **UI message** | Describe exactly which check failed (wrong type / too large / corrupt / password-protected) |
| **Implementation note** | Validate content, not filename extension alone. A `.pdf` file containing a JPEG must fail. |

---

### R-002 — Exact-File Duplicate

| Field | Value |
|---|---|
| **Stage** | Exact duplicate check (Stage 3) |
| **Checks** | SHA-256 hash of the uploaded file bytes is not present in `invoice_runs.file_sha256` for any run with `processing_state != 'FAILED'` |
| **Pass condition** | No matching hash found |
| **Failure severity** | `BLOCK` |
| **Failure outcome** | `BLOCKED` — exact file duplicate |
| **UI message** | "This exact file has been submitted before. Run [run_id] processed it on [date]." Show link to the original run. |
| **Implementation note** | Compute hash before any extraction. This is the cheapest possible duplicate check and runs first. |

---

## Rules — Document Content

### R-003 — Invoice Document Type

| Field | Value |
|---|---|
| **Stage** | Structured extraction (Stage 6) |
| **Checks** | LLM `extraction.document_type` field equals `"invoice"` |
| **Pass condition** | document_type is "invoice" with reasonable confidence |
| **Failure severity** | `REVIEW` if uncertain; `BLOCK` if clearly not an invoice |
| **Failure outcome** | `REVIEW_REQUIRED` (quote / statement / remittance) or `BLOCKED` (blank / unreadable) |
| **UI message** | "The document does not appear to be an invoice. Extracted type: [type]." |

---

### R-004 — Required Fields Present

| Field | Value |
|---|---|
| **Stage** | Extraction validation (Stage 7) |
| **Checks** | The following fields are non-null and non-empty after extraction: vendor name, invoice number, invoice date, currency, grand total |
| **Pass condition** | All five critical fields have values |
| **Failure severity** | `REVIEW` |
| **Failure outcome** | `REVIEW_REQUIRED` |
| **UI message** | List each missing field by name. "Invoice number is missing. Grand total is missing." |
| **Implementation note** | Do not guess or fill defaults for missing fields. Return null and flag. |

---

### R-005 — Evidence Quality

| Field | Value |
|---|---|
| **Stage** | Extraction validation (Stage 7) |
| **Checks** | Critical extracted fields (vendor name, invoice number, invoice date, grand total) have a non-empty source evidence snippet and a page reference |
| **Pass condition** | Evidence exists for all critical fields |
| **Failure severity** | `REVIEW` |
| **Failure outcome** | `REVIEW_REQUIRED` |
| **UI message** | "Insufficient extraction evidence for [field]. A reviewer should verify the source document." |
| **Implementation note** | For OCR-extracted fields, evidence quality is looser — use substring similarity rather than exact match. Mark low-quality evidence explicitly. |

---

## Rules — Vendor Validation

### R-006 — Vendor Exists

| Field | Value |
|---|---|
| **Stage** | Vendor validation (Stage 8) |
| **Checks** | The extracted vendor name or tax ID matches exactly one record in the `vendors` table |
| **Pass condition** | One vendor record found |
| **Failure severity** | `REVIEW` |
| **Failure outcome** | `REVIEW_REQUIRED` — unresolved vendor |
| **UI message** | "No vendor could be identified from the invoice. Extracted vendor name: [name]." |
| **Implementation note** | Match by tax ID first (exact), then by normalised legal name. Fuzzy name matching alone is never sufficient to approve a vendor. If two vendors match, treat as unresolved. |

---

### R-007 — Vendor Is Approved

| Field | Value |
|---|---|
| **Stage** | Vendor validation (Stage 8) |
| **Checks** | Matched vendor has `status = 'APPROVED'` |
| **Pass condition** | Vendor status is APPROVED |
| **Failure severity** | `BLOCK` |
| **Failure outcome** | `BLOCKED` — inactive or unapproved vendor |
| **UI message** | "Vendor [name] has status [status] and cannot receive a ready recommendation." |
| **Implementation note** | INACTIVE and UNAPPROVED both block. No exceptions. |

---

### R-008 — Vendor Tax ID Consistency

| Field | Value |
|---|---|
| **Stage** | Vendor validation (Stage 8) |
| **Checks** | If the invoice contains a tax ID, it matches the tax ID on the vendor master record |
| **Pass condition** | Tax IDs match, or no tax ID on the invoice |
| **Failure severity** | `REVIEW` |
| **Failure outcome** | `REVIEW_REQUIRED` — tax ID mismatch |
| **UI message** | "Invoice tax ID [invoice_tax_id] does not match vendor master tax ID [vendor_tax_id]." |
| **Implementation note** | Do not auto-correct. Do not silently ignore. Flag and route to review. |

---

## Rules — Purchase Order Matching

### R-009 — PO Exists

| Field | Value |
|---|---|
| **Stage** | PO matching (Stage 9) |
| **Checks** | A PO can be matched to this invoice — either by exact PO number or via candidate matching |
| **Pass condition** | One confirmed PO is associated with the run |
| **Failure severity** | `REVIEW` |
| **Failure outcome** | `REVIEW_REQUIRED` |
| **UI message** | "No purchase order reference found on invoice." or "PO [number] not found in the system." Show candidate POs if available. |
| **Implementation note** | Exact PO number match is preferred. Candidate matching is a suggestion only — never auto-assigns a PO. If multiple candidates exist, all are shown. Even a single candidate requires human confirmation (Decision D-005). |

---

### R-010 — PO Vendor Match

| Field | Value |
|---|---|
| **Stage** | PO matching (Stage 9) |
| **Checks** | The matched PO's `vendor_id` equals the matched vendor's `id` |
| **Pass condition** | PO belongs to the identified vendor |
| **Failure severity** | `BLOCK` (if vendor identity is definitive); `REVIEW` (if vendor is uncertain) |
| **Failure outcome** | `BLOCKED` or `REVIEW_REQUIRED` |
| **UI message** | "PO [po_number] belongs to vendor [po_vendor] but the invoice is from vendor [invoice_vendor]." |
| **Implementation note** | This check can never produce a READY outcome. If the vendor is uncertain (R-006 triggered REVIEW), use REVIEW for this rule too. |

---

### R-011 — PO Currency Match

| Field | Value |
|---|---|
| **Stage** | PO matching (Stage 9) |
| **Checks** | Invoice currency equals PO currency |
| **Pass condition** | Currencies match (both INR in this prototype) |
| **Failure severity** | `REVIEW` |
| **Failure outcome** | `REVIEW_REQUIRED` |
| **UI message** | "Invoice currency [invoice_currency] does not match PO currency [po_currency]." |

---

### R-016 — PO Status

| Field | Value |
|---|---|
| **Stage** | PO matching (Stage 9) |
| **Checks** | Matched PO has status `OPEN` or `PARTIALLY_INVOICED` |
| **Pass condition** | PO is open for invoicing |
| **Failure severity** | `BLOCK` (CANCELLED); `REVIEW` (CLOSED or unknown) |
| **Failure outcome** | `BLOCKED` (cancelled PO) or `REVIEW_REQUIRED` (closed PO) |
| **UI message** | "PO [po_number] has status [status] and cannot receive new invoices." |

---

## Rules — Duplicate Detection

### R-012 — Business-Key Duplicate

| Field | Value |
|---|---|
| **Stage** | Business duplicate check (Stage 10) |
| **Checks** | The combination of `vendor_id` + normalised invoice number does not exist in `invoice_runs` for any run that is not BLOCKED or FAILED |
| **Pass condition** | No matching business-key duplicate found |
| **Failure severity** | `BLOCK` (confirmed duplicate) or `REVIEW` (possible duplicate — see tiers) |
| **Failure outcome** | `BLOCKED` or `REVIEW_REQUIRED` per Decision D-003 |
| **UI message** | "Invoice [number] from vendor [name] has already been processed. Run [run_id] recorded it on [date]." |
| **Normalisation function** | `normalise_invoice_number(s)`: lowercase, strip spaces / hyphens / leading zeros. Applied consistently in one shared utility function. |

---

## Rules — Financial Reconciliation

### R-013 — Invoice Arithmetic

| Field | Value |
|---|---|
| **Stage** | Financial reconciliation (Stage 11) |
| **Checks** | `abs(declared_grand_total - (subtotal + tax_total + shipping_total - discount_total)) ≤ ROUNDING_ALLOWANCE_INR` |
| **Pass condition** | Variance within rounding allowance (default ₹1) |
| **Failure severity** | `REVIEW` |
| **Failure outcome** | `REVIEW_REQUIRED` |
| **UI message** | "Invoice arithmetic does not reconcile. Declared total: ₹[declared]. Calculated total: ₹[calculated]. Variance: ₹[variance]." |
| **Implementation note** | Use Python `Decimal` for all monetary arithmetic. Never use `float`. |

---

### R-014 — Line-Item Arithmetic

| Field | Value |
|---|---|
| **Stage** | Financial reconciliation (Stage 11) |
| **Checks** | For each line item where quantity, unit price, and line total are present: `abs(quantity × unit_price - line_total) ≤ ₹1` |
| **Pass condition** | All provided line totals reconcile |
| **Failure severity** | `REVIEW` |
| **Failure outcome** | `REVIEW_REQUIRED` |
| **UI message** | "Line item [description]: calculated ₹[calculated] but declared ₹[declared]." |
| **Implementation note** | Only validate lines where all three values are present. Null line data is not a failure of this rule. |

---

### R-015 — PO Remaining Balance

| Field | Value |
|---|---|
| **Stage** | PO balance check (Stage 12) |
| **Checks** | `po_variance = invoice_grand_total - remaining_po_amount`. Compare to `allowed_variance = min(remaining_po_amount × TOLERANCE_PERCENT, TOLERANCE_CAP_INR)` |
| **Pass condition** | `po_variance ≤ 0` (underbilling) OR `0 < po_variance ≤ allowed_variance` (within tolerance — warning issued) |
| **Failure severity** | `REVIEW` (overage outside tolerance); `BLOCK` (massive overage, configurable threshold) |
| **Failure outcome** | `REVIEW_REQUIRED` or `BLOCKED` |
| **UI message** | Show: PO total / previously consumed / remaining before this invoice / this invoice amount / variance / allowed variance / remaining after. |
| **Implementation note** | remaining_po_amount = po_total - sum(grand_total of all READY runs against this PO, excluding current run). Use Decimal. Never float. |

---

## Decision Engine — Application Order

```
Stage 1 — BLOCK checks (run all, collect failures):
  R-001 Valid PDF
  R-002 Exact-file duplicate
  R-007 Vendor approved
  R-010 PO-vendor match (if vendor is definitive)
  R-012 Business-key duplicate (confirmed tier)
  R-016 PO status (CANCELLED)

Stage 2 — REVIEW checks (run all, collect failures):
  R-003 Document type
  R-004 Required fields
  R-005 Evidence quality
  R-006 Vendor exists
  R-008 Vendor tax ID
  R-009 PO exists
  R-010 PO-vendor match (if vendor uncertain)
  R-011 PO currency
  R-012 Possible duplicate tier
  R-013 Invoice arithmetic
  R-014 Line-item arithmetic
  R-015 PO balance / tolerance
  R-016 PO status (CLOSED)

Stage 3 — Determine final status:
  if any BLOCK failures  → BLOCKED
  elif any REVIEW failures → REVIEW_REQUIRED
  else                   → READY_FOR_AP_APPROVAL
```

**All failures at all stages are recorded.** The decision report shows every rule that fired, its result, actual value, expected value, and message. The interviewer should be able to see why each invoice got its status.
