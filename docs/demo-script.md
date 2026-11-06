# LedgerFlow — Demo Script

**Purpose:** Step-by-step walkthrough for the five demo scenarios. Run these in order. Reset data between full demo runs.

---

## Pre-Demo Reset

Run this before every fresh demo session:

```bash
# From the backend directory
python scripts/seed.py --reset

# This will:
# 1. Delete all invoice_runs, run_stages, rule_results, invoice_decisions, review_events
# 2. Re-seed vendors (V-001 through V-005)
# 3. Re-seed purchase orders (PO-1001 through PO-6001)
# 4. Clear uploaded file storage
# 5. Print a confirmation with vendor and PO counts
```

**Verify before demoing:**
- [ ] Dashboard shows 0 invoices
- [ ] Vendors page shows 5 vendors
- [ ] POs page shows 8 POs
- [ ] PO-1001 balance: ₹1,00,000 (no prior invoices)
- [ ] PO-2001 balance: ₹1,00,000 (no prior invoices)

---

## Demo 1 — Happy Path

**Invoice file:** `sample_data/invoices/invoice_happy_path.pdf`  
**Expected outcome:** `READY_FOR_AP_APPROVAL`  
**What to highlight:** Full extraction, vendor match, PO match, arithmetic, traceability

### Steps

1. Click **Upload Invoice** in the nav
2. Drag and drop `invoice_happy_path.pdf`
3. Click **Process Invoice**
4. Watch the **live run timeline** — narrate each stage as it appears:
   - *"File received and validated"*
   - *"No duplicate found"*
   - *"PyMuPDF extracted selectable text"*
   - *"Qwen3.8-27B on Groq is extracting structured fields"* (note the speed)
   - *"Vendor V-001 matched"*
   - *"PO-1001 matched"*
   - *"Arithmetic reconciles"*
5. Decision panel shows **READY FOR AP APPROVAL** in green
6. Open the **Extracted Invoice panel** — show:
   - Vendor name matched to V-001
   - Invoice number, date, PO number
   - Grand total ₹94,400
   - Source evidence snippet for each field
7. Open the **PO Comparison panel** — show:
   - PO total: ₹1,00,000
   - Previously consumed: ₹0
   - This invoice: ₹94,400
   - Remaining after: ₹5,600
8. Open the **Rule Results panel** — show all 13 rules and their PASS status

**Key narration point:** *"The LLM read the invoice and extracted structured fields. The backend performed all financial checks using deterministic arithmetic — not the AI. The AI never decided whether this invoice was valid."*

---

## Demo 2 — EC-1: Duplicate Invoice

**Invoice files:**
- First upload: `invoice_happy_path.pdf` (same file from Demo 1)
- Second upload: `invoice_duplicate_reformatted.pdf` (different layout, same vendor + invoice number)

**Expected outcomes:** Both `BLOCKED`

> ⚠️ **Prerequisite:** Demo 1 must have been run first (or the seed data must have a confirmed run for AST-2026-041). Do NOT reset between Demo 1 and Demo 2.

### Steps — Exact file duplicate

1. Click **Upload Invoice**
2. Upload `invoice_happy_path.pdf` again (the same file)
3. Watch the timeline — it stops at **Exact Duplicate Check**
4. Decision: **BLOCKED** immediately
5. UI shows: "This exact file was submitted before. See Run [link to Demo 1 run]."

**Narration:** *"The SHA-256 hash matched in milliseconds. No extraction cost was incurred. The original run is linked in the blocked message."*

### Steps — Business-key duplicate

1. Click **Upload Invoice**
2. Upload `invoice_duplicate_reformatted.pdf` (different PDF, same vendor and invoice number)
3. Timeline runs through extraction and vendor matching
4. Stops at **Business Duplicate Check**
5. Decision: **BLOCKED**
6. UI shows: "Invoice AST-2026-041 from Aster Office Supplies already processed. See Run [link]."

**Narration:** *"Even though the file bytes were different, the normalised combination of vendor ID and invoice number matched a prior run. The system stopped before creating duplicate liability."*

---

## Demo 3 — EC-2: Split PO (Partial Invoices)

**Invoice files:**
- `invoice_split_1.pdf` — ₹40,000 against PO-2001
- `invoice_split_2.pdf` — ₹60,000 against PO-2001
- `invoice_split_3.pdf` — ₹1,000 against PO-2001 (over-billing attempt)

**Expected outcomes:** Split 1 → READY, Split 2 → READY (after split 1 commits), Split 3 → REVIEW_REQUIRED or BLOCKED

> ⚠️ **Reset data before this demo** so PO-2001 has ₹1,00,000 balance.

### Steps

1. Upload `invoice_split_1.pdf` → watch it reach **READY FOR AP APPROVAL**
2. Open **PO Comparison panel**:
   - PO total: ₹1,00,000
   - Previously consumed: ₹0
   - This invoice: ₹40,000
   - Remaining after: ₹60,000

3. Upload `invoice_split_2.pdf` → watch it reach **READY FOR AP APPROVAL**
4. Open **PO Comparison panel**:
   - PO total: ₹1,00,000
   - Previously consumed: ₹40,000 (from split 1, now committed)
   - This invoice: ₹60,000
   - Remaining after: ₹0

5. Upload `invoice_split_3.pdf` → watch it reach **REVIEW_REQUIRED** or **BLOCKED**
6. Open **PO Comparison panel**:
   - PO total: ₹1,00,000
   - Previously consumed: ₹1,00,000
   - Remaining: ₹0
   - This invoice: ₹1,000
   - Over-billing caught

**Narration:** *"The system tracked cumulative consumption across runs. The third invoice correctly detected that the PO was fully consumed. This check used decimal arithmetic, not an AI estimate."*

---

## Demo 4 — EC-3: Missing PO Reference

**Invoice file:** `invoice_missing_po.pdf`  
**Vendor:** V-002 (Northstar IT Services) — has two open POs: PO-2002 and PO-2003  
**Expected outcome:** `REVIEW_REQUIRED` with two PO candidates shown

### Steps

1. Upload `invoice_missing_po.pdf`
2. Watch timeline — PO matching stage shows `NEEDS_ATTENTION`
3. Decision: **REVIEW REQUIRED**
4. Open **PO Matching panel** — show:
   - "No PO reference found on invoice"
   - "2 candidate POs found for vendor V-002:"
     - PO-2002: ₹80,000, Open — match reasons: same vendor, same currency, amount within range
     - PO-2003: ₹75,000, Open — match reasons: same vendor, same currency
   - "Human confirmation required before this invoice can proceed"
5. Show the **Reviewer Form** — reviewer can select PO-2002 and add a note
6. Click **Confirm PO-2002** — run updates, reviewer action appears in audit history

**Narration:** *"The system found two plausible POs but did not silently pick one. Attaching a liability to the wrong PO is a financial error. The reviewer sees the evidence and makes the decision."*

---

## Demo 5 — EC-4: Scanned / Low Quality Invoice

**Invoice file:** `invoice_low_quality_scan.pdf`  
**Expected outcome:** `REVIEW_REQUIRED` — OCR/vision used, one field uncertain

### Steps

1. Upload `invoice_low_quality_scan.pdf`
2. Watch timeline — `OCR / Vision Fallback` stage runs (not skipped)
3. Extracted Invoice panel shows:
   - `extraction.is_scanned_or_ocr = true`
   - Extraction method: VISION
   - One field (e.g. invoice number) marked as low confidence or null
   - Evidence snippet shows the OCR/vision text that was unclear
4. Decision: **REVIEW REQUIRED**
5. Rule results show R-004 or R-005 failure for the uncertain field
6. UI highlights the uncertain field in amber with the evidence shown

**Narration:** *"The PDF had no selectable text. PyMuPDF rendered it to images and Qwen's vision capability read the invoice directly — no separate OCR service needed. It correctly flagged the blurred field rather than inventing a value. A person needs to verify that field."*

---

## Dashboard Review (Final Step of All Demos)

1. Navigate to **Overview / Dashboard**
2. Show the summary cards: X Ready / Y Review Required / Z Blocked
3. Show the invoice table with all processed runs
4. Click into any previous run — confirm the full history is still there
5. Show the audit trail on a reviewed run (original decision + reviewer action)

**Narration:** *"Every run is persisted. The original automated decision is never overwritten. The reviewer's action is appended to the audit trail. This gives a full chain of custody for every invoice."*

---

## Timing Reference

| Demo | Expected duration | Key point |
|---|---|---|
| Happy path | ~45 seconds processing + 2 min narration | Show timeline + evidence + rules |
| EC-1 Duplicate | ~30 seconds each | Speed of hash check; link to original |
| EC-2 Split PO | ~3 min total | Show balance decreasing across runs |
| EC-3 Missing PO | ~1 min processing + 1 min review UI | Candidate matching; human decision |
| EC-4 Scan | ~2 min processing + 1 min UI | Vision fallback; uncertain field |
| Dashboard review | ~1 min | Persistence and audit trail |

**Total demo time:** ~12–15 minutes for all five. For a 5-minute video, use: Happy path (2 min) + one edge case (2 min) + dashboard (1 min).
