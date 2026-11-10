# LedgerFlow — Live Demo & Presentation Walkthrough

**Purpose:** Step-by-step walkthrough for demonstrating LedgerFlow's architecture, AI field extraction, deterministic reconciliation, and human review governance.

---

## Pre-Demo Reset

Run this before starting a demo presentation to restore a pristine state:

```bash
# From the backend directory
python scripts/seed.py --reset

# This will:
# 1. Clear all previous invoice_runs, stages, rule_results, decisions, and review events
# 2. Re-seed vendors (V-001 through V-005) in Supabase PostgreSQL
# 3. Re-seed purchase orders (PO-1001 through PO-6001)
# 4. Invalidate the backend and client-side memory caches
```

**Pre-Flight Verification:**
- [ ] Dashboard ([http://localhost:3000](http://localhost:3000)) shows 0 invoices processed.
- [ ] Vendors & POs page ([http://localhost:3000/vendors](http://localhost:3000/vendors)) shows 5 vendors and 8 purchase orders.
- [ ] PO-1001 remaining balance shows `₹1,00,000.00`.
- [ ] PO-2001 remaining balance shows `₹1,00,000.00`.

---

## Demo 1 — Happy Path & AI Executive Run Briefing

**File:** `sample_data/invoices/invoice_happy_path.pdf`  
**Expected Outcome:** `READY_FOR_AP_APPROVAL`  
**What to Highlight:** Fast Gemini extraction, 13-stage timeline, instant AI Executive Briefing, inline PO Preview Modal, and deterministic decimal reconciliation.

### Walkthrough Steps

1. Navigate to **Upload Invoice** (`/upload`).
2. Drag and drop `invoice_happy_path.pdf` and click **Process Invoice**.
3. Point out the **Live Run Timeline** as stages transition in real-time:
   * *PDF validation confirms format and page limits.*
   * *SHA-256 byte check confirms unique file.*
   * *Gemini 3.5 Flash Lite extracts structured fields in ~2.1 seconds.*
   * *Vendor V-001 (Aster Office Supplies) matched via GSTIN.*
   * *PO-1001 linked and verified.*
   * *Financial arithmetic reconciles to exact decimal.*
4. **Highlight the AI Executive Run Briefing Card at the top:**
   * **4-Pill Snapshot:**
     * `PO Matching`: `PO-1001 (Matched)`
     * `Spend & Budget`: `₹94,400.00 (₹5,600 left)`
     * `Audit & Integrity`: `0 Flags · Verified Clean`
     * `Action Verdict`: `Approve in AP`
   * **Natural-Language Summary:** Read aloud the generated paragraph confirming exact tax integrity, zero duplicate risk, and safe release.
5. **Demonstrate the Inline PO Preview Modal:**
   * Click the **Preview PO** button next to `PO-1001` or in the budget reconciliation card.
   * Point out that **no page redirection occurs**; an inline modal opens presenting the PO total, remaining balance prior to run, balance after run (`₹5,600.00`), order description, and line item specifications.
   * Dismiss the modal with a single click.
6. Click **Confirm PO PO-1001** to record the auditor sign-off.

---

## Demo 2 — 3-Tier Duplicate Detection (Fraud Prevention)

**Files:**
1. `sample_data/invoices/invoice_happy_path.pdf` (same file re-uploaded)
2. `sample_data/invoices/invoice_duplicate_reformatted.pdf` (different PDF layout, identical vendor + invoice number)

**Expected Outcomes:** Both `BLOCKED`

### Walkthrough Steps

#### Exact File Duplicate (Byte-Level)
1. Upload `invoice_happy_path.pdf` a second time.
2. Watch the timeline immediately halt at **Stage 3: Exact Duplicate Check**.
3. Status: **BLOCKED**.
4. **Key Talking Point:** *"The SHA-256 hash matched existing records in milliseconds. The pipeline aborted early before calling any AI extraction, incurring zero LLM cost."*

#### Business-Key Duplicate (Reformatted PDF)
1. Upload `invoice_duplicate_reformatted.pdf`.
2. Notice the file passes Stage 3 (different SHA-256 hash).
3. PyMuPDF and Gemini extract the fields.
4. Watch the pipeline halt at **Stage 10: Business Duplicate Check**.
5. Status: **BLOCKED**.
6. **Key Talking Point:** *"Even though the vendor rearranged the layout and changed the file bytes, the business composite key `(Vendor ID + Normalised Invoice #)` caught the duplicate and prevented double liability."*

---

## Demo 3 — Split PO & Cumulative Budget Tracking

**Files:**
* `invoice_split_1.pdf` — ₹40,000 against PO-2001
* `invoice_split_2.pdf` — ₹60,000 against PO-2001
* `invoice_split_3.pdf` — ₹1,000 against PO-2001 (over-billing attempt)

### Walkthrough Steps

1. Upload `invoice_split_1.pdf` → reaches `READY_FOR_AP_APPROVAL`.
   * Remaining balance updates: `₹1,00,000 - ₹40,000 = ₹60,000 remaining`.
2. Upload `invoice_split_2.pdf` → reaches `READY_FOR_AP_APPROVAL`.
   * Remaining balance updates: `₹60,000 - ₹60,000 = ₹0.00 remaining`.
3. Upload `invoice_split_3.pdf` (₹1,000 billing attempt).
   * Flagged as `REVIEW_REQUIRED` or `BLOCKED` because PO-2001 balance is ₹0.00 and exceeds the ₹500 tolerance cap.
4. **Key Talking Point:** *"All cumulative consumption is computed using idempotent SQL aggregations with Python Decimal precision—not floating-point approximations."*

---

## Demo 4 — Missing PO & Candidate Auto-Suggestion

**File:** `sample_data/invoices/invoice_missing_po.pdf`  
**Vendor:** V-002 (Northstar IT Services)  
**Expected Outcome:** `REVIEW_REQUIRED` with candidate PO scoring.

### Walkthrough Steps

1. Upload `invoice_missing_po.pdf`.
2. Timeline runs through extraction; Stage 9 shows `NEEDS_ATTENTION`.
3. Decision: **REVIEW REQUIRED**.
4. The Executive Briefing flags: *"No purchase order reference was found on the document. Candidate PO-2001 was detected in the system."*
5. In the Human Review form, the auditor selects `ASSIGN_PO`, enters a review note, and clicks **Submit Review Decision**.

---

## Demo 5 — Arithmetic Reconciliation & Tax Failure

**File:** `sample_data/invoices/invoice_total_mismatch.pdf`  
**Expected Outcome:** `REVIEW_REQUIRED` with Rule R-013 violation.

### Walkthrough Steps

1. Upload `invoice_total_mismatch.pdf`.
2. Stage 11 flags mathematical variance: $\text{Declared} \ne \text{Subtotal} + \text{Tax}$.
3. Decision: **REVIEW REQUIRED**.
4. The auditor inspects the discrepancy, enters an explanation, and clicks **Request Vendor Info** or **Reject**.
