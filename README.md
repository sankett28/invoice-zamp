# LedgerFlow

**Invoice Processing Automation — Zamp PS-1 Case Study**

LedgerFlow turns vendor invoice PDFs into traceable AP decision recommendations. An AP operator uploads an invoice; the system extracts fields, validates against vendor and PO records, checks for duplicates, reconciles arithmetic, and produces an explainable outcome. Uncertain cases go to a human reviewer — they are never silently approved.

**Core design principle:** AI for unstructured extraction. Deterministic code for financial decisions.

---

## Live Demo

| Resource | URL |
|---|---|
| Frontend | _(add Vercel URL after deployment)_ |
| Backend health | _(add Railway URL)/api/health_ |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | Python 3.12, FastAPI, Pydantic |
| Database | PostgreSQL (Supabase) |
| File storage | Supabase Storage |
| PDF extraction | PyMuPDF |
| LLM (primary) | `qwen/qwen3.8-27b` via Groq SDK |
| LLM (fallback) | `gemini-3.8-flash` via `google-genai` SDK |
| OCR | Qwen vision mode (primary); Tesseract (last-resort fallback) |
| Deployment | Vercel + Railway + Supabase |

---

## Local Development Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL (local Docker or Supabase free project)
- Groq API key
- Google Gemini API key (fallback)

### 1. Clone and configure

```bash
git clone <repo-url>
cd ledgerflow
cp .env.example .env
# Fill in your API keys and database URL in .env
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed vendors and purchase orders
python scripts/seed.py

# Start the API server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### 4. Verify

- Backend health: `GET http://localhost:8000/api/health`
- Upload a PDF from `sample_data/invoices/` and confirm a run is created

---

## Seed and Reset

```bash
# Seed only (vendors + POs, no data cleared)
python backend/scripts/seed.py

# Full reset (clears all invoice runs + audit data, re-seeds master data)
python backend/scripts/seed.py --reset

# Useful before a live demo to restore a known clean state
```

---

## Sample Data

Located in `sample_data/`:

| File | Scenario | Expected outcome |
|---|---|---|
| `invoices/invoice_happy_path.pdf` | Clean invoice, V-001, PO-1001 | READY_FOR_AP_APPROVAL |
| `invoices/invoice_duplicate_reformatted.pdf` | Same vendor + invoice number, different layout | BLOCKED (business-key dup) |
| `invoices/invoice_split_1.pdf` | First partial invoice, PO-2001, ₹40,000 | READY_FOR_AP_APPROVAL |
| `invoices/invoice_split_2.pdf` | Second partial invoice, PO-2001, ₹60,000 | READY_FOR_AP_APPROVAL |
| `invoices/invoice_split_3.pdf` | Over-billing attempt, PO-2001, ₹1,000 | REVIEW_REQUIRED / BLOCKED |
| `invoices/invoice_missing_po.pdf` | No PO reference, V-002 (two open POs) | REVIEW_REQUIRED |
| `invoices/invoice_low_quality_scan.pdf` | Image-only PDF, blurred field | REVIEW_REQUIRED |
| `invoices/invoice_vendor_po_mismatch.pdf` | Invoice vendor ≠ PO owner | BLOCKED |
| `invoices/invoice_total_mismatch.pdf` | Subtotal + tax ≠ declared total | REVIEW_REQUIRED |
| `vendors.csv` | Vendor master data | — |
| `purchase_orders.csv` | PO master data | — |

---

## Running Tests

```bash
cd backend
pytest tests/ -v

# Key test modules:
# tests/test_reconciliation.py      — invoice arithmetic and PO balance
# tests/test_duplicate_detection.py — file hash and business-key checks
# tests/test_po_matching.py         — exact and candidate PO matching
# tests/test_decision_engine.py     — rule priority and status assignment
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/invoices` | Upload PDF and start a processing run |
| `GET` | `/api/runs` | List runs (paginated, filterable by status) |
| `GET` | `/api/runs/{run_id}` | Full run detail — stages, extraction, rules, decision |
| `GET` | `/api/runs/{run_id}/file` | Download original PDF |
| `POST` | `/api/runs/{run_id}/retry` | Retry a failed run without erasing prior attempt |
| `POST` | `/api/runs/{run_id}/review` | Record human review action and reason |
| `GET` | `/api/vendors` | List vendor master records |
| `GET` | `/api/purchase-orders` | List / filter PO records |
| `GET` | `/api/health` | Health check |

---

## Design Decisions

All key decisions are documented in [`docs/decisions.md`](docs/decisions.md).

Summary:

| Decision | Choice |
|---|---|
| Currency | INR only |
| PO consumption | READY = committed (idempotent) |
| Duplicate tiers | 3-tier: exact file / business-key → BLOCKED; possible → REVIEW |
| Tolerance | 1% of remaining PO, capped at ₹500 (configurable) |
| Ambiguous PO | Always requires human confirmation |
| Reviewer UI | Minimal form: Confirm / Return / Reject + mandatory note |
| LLM primary | qwen/qwen3.8-27b on Groq (vision + text) |
| LLM fallback | gemini-3.8-flash via google-genai SDK |
| Deployment | Vercel + Railway + Supabase |

---

## Known Limitations

These are stated honestly as part of the case study:

1. **PO data is seeded test data** — not connected to a live procurement system.
2. **PO consumption is immediate on READY** — in production, consumption would occur only after explicit AP approval.
3. **No goods-received-note (GRN) verification** — delivery confirmation is not checked.
4. **Tax arithmetic only** — not legal GST/VAT compliance determination.
5. **INR only** — no multi-currency support. Non-INR invoices are routed to review.
6. **Fuzzy PO matching is a suggestion** — requires human confirmation when PO reference is absent.
7. **OCR/LLM can misread digits** — uncertain critical fields are always routed to review, never auto-approved.
8. **Single-instance background processing** — suitable for demo, not a durable production workflow engine.
9. **No real authentication** — reviewer identity is a demo label; enterprise auth is out of scope.
10. **This system does not initiate or schedule payments** — it produces a recommendation for the next AP approval step.

---

## Documentation Index

| File | Contents |
|---|---|
| [`docs/decisions.md`](docs/decisions.md) | All 8 locked design decisions with rationale |
| [`docs/business-rules.md`](docs/business-rules.md) | 16 business rules with pass conditions and decision engine order |
| [`docs/extraction-schema.md`](docs/extraction-schema.md) | LLM invoice schema, Pydantic models, prompt template, normalisation rules |
| [`docs/data-model.md`](docs/data-model.md) | 7 database tables with types, constraints, indexes, seed data |
| [`docs/demo-script.md`](docs/demo-script.md) | Step-by-step walkthrough for all 5 demo scenarios |
| [`.env.example`](.env.example) | All environment variables with defaults |
