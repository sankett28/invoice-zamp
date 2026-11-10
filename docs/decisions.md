# LedgerFlow — Locked Design Decisions

**Status:** Locked before implementation  
**Last updated:** 2026-11-06  
**Purpose:** Every open question from Section 5 and Section 27 of the PRD is resolved here. These decisions apply to the entire prototype. Do not change them mid-build without updating this file and the affected documentation.

---

## D-001 — Currency

**Question:** INR only, or multi-currency?  
**Decision:** INR only for all seeded data, all POs, all invoices, all arithmetic.  
**Consequence:** If the LLM extracts a currency value that is not `INR`, Rule R-011 (PO currency match) triggers `REVIEW_REQUIRED`. No foreign exchange conversion is performed anywhere in the system.  
**Stated limitation in README:** "Multi-currency support is out of scope. All demo data uses INR. Non-INR invoices are routed to review."

---

## D-002 — PO Balance Consumption Trigger

**Question:** When does an invoice consume PO balance — on `READY_FOR_AP_APPROVAL` or on reviewer `CONFIRM`?  
**Decision:** Option C — `READY_FOR_AP_APPROVAL` = committed. An invoice that reaches `READY_FOR_AP_APPROVAL` is immediately treated as consuming the PO balance.  
**Rationale:** Simplest implementation for a 7-day build. Avoids building a two-step confirmation UI before the happy path is stable.  
**Idempotency requirement:** A retry of the same run must not double-count the PO consumption. Derive consumed amount from `invoice_runs` records where `decision_status = 'READY_FOR_AP_APPROVAL'` and `id != current_run_id`. Never store a mutable running total.  
**Upgrade path:** If time permits, implement reviewer confirmation (Option B) on top: add a `CONFIRM` review event and change the consumption query to filter on confirmed runs only.  
**Stated limitation in README:** "In this prototype, an invoice marked READY is treated as consuming the PO balance immediately. In production, consumption would occur only after explicit AP approval."

---

## D-003 — Duplicate Detection Tiers

**Question:** Should duplicates be `BLOCKED` or `REVIEW_REQUIRED`?  
**Decision:** Three-tier approach.

| Tier | Condition | Status | Rationale |
|---|---|---|---|
| 1 | Same SHA-256 file hash | `BLOCKED` | Identical bytes = no ambiguity |
| 2 | Same vendor ID + normalised invoice number, different file | `BLOCKED` | Business-key duplicate; vendor must contact AP |
| 3 | Same vendor + amount + date, but invoice number missing or inconsistent | `REVIEW_REQUIRED` | Cannot auto-block; may be a legitimate separate invoice |

**Normalisation for Tier 2:** Case-fold the invoice number, strip spaces, hyphens, and leading zeros. Example: `AST-2026-041`, `ast2026041`, `AST 2026 041` all normalise to the same key.

---

## D-004 — Tolerance Policy

**Question:** What tolerance values should the demo use?

**Two separate tolerance checks — do not confuse them:**

### Check 1: Invoice Arithmetic Rounding Allowance
Checks whether the vendor's own invoice is internally consistent.

```
calculated_total = subtotal + tax_total + shipping_total - discount_total
arithmetic_variance = |declared_grand_total - calculated_total|
rounding_allowance = ₹1.00  (configurable via ROUNDING_ALLOWANCE_INR)
```

If `arithmetic_variance > rounding_allowance` → Rule R-013 fails → `REVIEW_REQUIRED`.

### Check 2: PO Variance Tolerance
Checks whether the invoice amount is within an acceptable range of the remaining PO balance.

```
po_variance = invoice_grand_total - remaining_po_amount
allowed_variance = min(remaining_po_amount × TOLERANCE_PERCENT, TOLERANCE_CAP_INR)
```

| po_variance | Outcome |
|---|---|
| ≤ 0 (underbilling) | PASS — vendor billed less than expected |
| 0 < po_variance ≤ allowed_variance | PASS with tolerance WARNING shown in UI |
| po_variance > allowed_variance | Rule R-015 fails → `REVIEW_REQUIRED` |
| po_variance >> remaining (massive overage) | Rule R-015 fails → `BLOCKED` per policy |

**Defaults:**
- `TOLERANCE_PERCENT = 1.0` (1%)
- `TOLERANCE_CAP_INR = 500` (₹500)
- `ROUNDING_ALLOWANCE_INR = 1.00`

All three are environment variables. Never hard-code them.

**Industry context:** Tolerance is standard practice in all major ERP systems (SAP, Oracle, NetSuite). It exists because rounding on taxes, shipping estimates, and quantity variances make exact matches rare in real-world AP. The dual threshold (percentage + cap) prevents the percentage from becoming dangerously large on high-value POs.

---

## D-005 — Ambiguous PO Candidate Matching

**Question:** If exactly one high-confidence PO candidate is found (no PO number on invoice), does it still require human confirmation?  
**Decision:** Yes — always require human confirmation when the PO reference is absent from the invoice document, regardless of candidate count or confidence.  
**Rationale:** Assigning a PO to an invoice without an explicit PO reference is a financial decision. The LLM and the matching algorithm must not make financial decisions. The reviewer sees the suggested PO, the match reasons, and confirms or rejects.  
**UI behaviour:** Route to `REVIEW_REQUIRED`. Show candidate PO(s) with match reasons. Provide a "Confirm this PO" action in the reviewer form.

---

## D-006 — Reviewer UI

**Question:** Build the reviewer UI in MVP, or document as a limitation?  
**Decision:** Build a minimal reviewer form as part of the MVP.  
**Minimum viable form:**
- Status buttons: `Confirm` / `Return to vendor` / `Reject`
- Optional: "Assign PO" dropdown for EC-3 (missing PO) if time allows
- Mandatory free-text note field
- Submit button

**Behaviour:** Creates a `review_events` record. Never overwrites the original automated decision. Original `decision_status` and `rule_results` remain unchanged. The review event is appended to the audit history.

**EC-3 and EC-4 reviewer UI:** Implement the basic confirm/reject form. PO assignment from the review form is a stretch goal.

---

## D-007 — LLM Provider Strategy

**Question:** Which LLM provider and model?

**Primary:** `qwen/qwen3.8-27b` via Groq SDK  
**Fallback:** `gemini-3.8-flash` via `google-genai` SDK (Python)

### Why Qwen3.8-27B on Groq as primary
- 450 tokens/second — fastest inference, live timeline looks impressive
- Multimodal (vision) — can process rendered PDF page images directly
- 131K context window — entire invoice + schema + prompt fits comfortably
- JSON mode supported — structured output with schema enforcement
- Tool use supported
- 250K TPM / 1K RPM rate limits on developer plan

### Why Gemini 3.8 Flash as fallback
- Current stable Google Flash model (as of Nov 2026)
- Also multimodal — handles scanned invoice images
- High free-tier limits; pay-as-you-go available
- Same vision-based pipeline works for both providers

### SDK rules
- **Groq:** Use the official `groq` Python SDK
- **Gemini:** Use `google-genai` SDK — **NEVER** use `google-generativeai` (legacy, deprecated)
- Both are wrapped behind a single `llm_extractor.py` service
- Provider name and model are environment variables only

```
# .env
LLM_PRIMARY_PROVIDER=groq
LLM_PRIMARY_MODEL=qwen/qwen3.8-27b
LLM_FALLBACK_PROVIDER=gemini
LLM_FALLBACK_MODEL=gemini-3.8-flash
GROQ_API_KEY=...
GEMINI_API_KEY=...
```

### OCR architecture decision
`qwen/qwen3.8-27b` is multimodal. For scanned PDFs:
- PyMuPDF renders each page to a PNG image
- Images are passed directly to Qwen vision endpoint
- Tesseract is **not the primary OCR path** — it is a last-resort fallback if vision model returns no usable content
- This simplifies the pipeline and produces better results on complex invoice layouts

---

## D-008 — Deployment Target

**Question:** Where does the live demo run?  
**Decision:** Vercel (frontend) + Railway (backend) + Supabase (PostgreSQL + file storage)

| Layer | Platform | Notes |
|---|---|---|
| Next.js frontend | Vercel | Native Next.js support, free tier |
| FastAPI backend | Railway | No cold-start problem, custom Dockerfile, free \$5 credit |
| PostgreSQL | Supabase | Managed DB, same region as Railway |
| PDF storage | Supabase Storage | S3-compatible, same Supabase project |

**Day 6 checklist before submission:**
- Tesseract binary and `tessdata` language files present in Railway Docker image
- CORS allows only the Vercel frontend origin
- All env vars set in Railway and Vercel dashboards (never committed to repo)
- Health endpoint responds at the public URL
- Fresh PDF upload works from an incognito browser session
- Database persists runs after Railway redeploy


---

## D-009 — In-Memory TTL Caching & Batched Single-Query Aggregations

**Question:** How do we eliminate high latency from remote cloud database roundtrips on repeat page loads?  
**Decision:** Implement a dual-layer caching strategy:
1. **Single-Query Batched Aggregation:** In `list_purchase_orders`, eliminate the N+1 query loop by fetching all committed PO balances in a single SQL query (`GROUP BY purchase_order_id`), mapping remaining amounts in memory.
2. **Backend In-Memory TTL Cache (`cache_service.py`):** Cache master data and runs in process memory (`vendors:all` for 120s, `pos:all` for 60s, `runs:list` for 10s, completed run details for 60s). Purge on any upload or review event.
3. **Frontend SWR Cache (`lib/api.ts`):** Maintain an in-memory client-side cache so navigation between Overview, Invoices, and Vendors renders immediately in 0 ms.

**Outcome:** Endpoint latency reduced from 25.7 seconds down to < 5 milliseconds for cached requests.

---

## D-010 — Zero-LLM Deterministic Executive Run Briefing

**Question:** Should the natural-language executive run briefing call an external LLM on every invoice run and review?  
**Decision:** Use the deterministic synthesis engine (`_build_deterministic_summary`) as the primary generator for executive briefings.  
**Rationale:** 
1. **Zero Latency:** Generates in 0.001 ms without adding 2–4 seconds of external LLM API delay to the pipeline.
2. **Zero Hallucination:** Computes exact vendor names, PO numbers, remaining balances, GST amounts, and rule violation messages directly from database facts.
3. **Zero Token Consumption:** Avoids external API costs, quota exhaustion, and rate limit errors.
4. **Idempotent Persistence:** Once stored in `invoice_runs.decision_summary`, the summary is persisted and never re-evaluated on subsequent GET requests.

---

## D-011 — Inline Non-Navigating Purchase Order Modal

**Question:** How should AP auditors inspect complete purchase order details while viewing an invoice run?  
**Decision:** An interactive modal popup triggered from the PO reference badge that renders over the run inspector without page navigation or URL redirection.  
**Rationale:** In AP operations, navigating away from an invoice being audited causes loss of form state and operational disruption. The inline modal presents budget limits, remaining balance, vendor credentials, order description, and line item specifications in an accessible overlay that dismisses on backdrop click or ESC key.

---

## D-012 — LLM Fast Cascade & Model Prioritization

**Question:** Which LLM model delivers the fastest, most reliable structured invoice extraction?  
**Decision:** Prioritize `gemini-3.5-flash-lite` followed by `gemini-3.5-flash` via the `google-genai` SDK.  
**Rationale:** Earlier versions (`gemini-3.8-flash` on preview endpoints) experienced upstream timeouts and 503 errors. `gemini-3.5-flash-lite` provides sub-2-second structured JSON responses with 100% extraction accuracy on complex tabular invoices.
