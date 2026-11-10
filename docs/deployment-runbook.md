# LedgerFlow — Production Deployment Runbook

**Version:** 2.0  
**Status:** Verified  
**Scope:** Containerized, Cloud, and Hybrid Deployments (Vercel, Railway, Supabase, AWS)

---

## 1. Prerequisites & Environment Matrix

- **Operating System:** Linux (Ubuntu 22.04+ / Debian 12), Windows Server, or Containerized Alpine/Debian
- **Runtime:** Python 3.12+, Node.js 20+
- **Database:** PostgreSQL 15+ (Supabase, AWS RDS, or Self-Hosted) with `uuid-ossp`
- **File Storage:** Supabase Storage (`ledgerflow-invoices` bucket) or AWS S3
- **OCR Engine (Fallback):** Tesseract OCR 5.x (`tesseract-ocr`, `tesseract-ocr-eng`)
- **LLM API Credentials:** Google Gemini API Key

---

## 2. Production Environment Variables

### Backend Environment (`backend/.env`)

```ini
# =============================================================================
# LedgerFlow Production Settings
# =============================================================================

# LLM Extractor (Primary: Google Gemini 3.5 Flash Lite)
LLM_PRIMARY_PROVIDER=gemini
LLM_PRIMARY_MODEL=gemini-3.5-flash-lite
LLM_FALLBACK_PROVIDER=gemini
LLM_FALLBACK_MODEL=gemini-3.5-flash-lite
GEMINI_API_KEY=AIzaSy_your_gemini_production_key_here

LLM_TIMEOUT_SECONDS=30
LLM_MAX_RETRIES=1

# Database (Supabase PostgreSQL via asyncpg)
DATABASE_URL=postgresql+asyncpg://postgres:your_password@db.your_project.supabase.co:5432/postgres

# Object Storage (Supabase Storage)
STORAGE_BACKEND=supabase
SUPABASE_URL=https://your_project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_secret_key
SUPABASE_STORAGE_BUCKET=ledgerflow-invoices

# Financial Policy Tolerances
TOLERANCE_PERCENT=1.0
TOLERANCE_CAP_INR=500.0
ROUNDING_ALLOWANCE_INR=1.0

# CORS & Networking
FRONTEND_URL=https://ledgerflow.yourdomain.com
APP_PORT=8000
APP_ENV=production
```

### Frontend Environment (`frontend/.env.production`)

```ini
NEXT_PUBLIC_API_URL=https://api.ledgerflow.yourdomain.com
```

---

## 3. Deployment Targets

### A. Frontend on Vercel
1. Link your GitHub repository to Vercel.
2. Set the **Root Directory** to `frontend`.
3. Set the Framework Preset to **Next.js**.
4. Configure Environment Variable:
   * `NEXT_PUBLIC_API_URL`: Your backend Railway / Cloud URL (e.g., `https://api.ledgerflow.yourdomain.com`).
5. Deploy. Vercel automatically runs `npm run build` using Turbopack.

### B. Backend on Railway
1. Create a new service from the GitHub repository.
2. Set the **Root Directory** to `/backend`.
3. Build Command: `pip install -r requirements.txt`.
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 4`.
5. Add all backend environment variables from Section 2 in the Railway Dashboard.
6. Verify deployment at `https://your-railway-app.up.railway.app/api/health`.

### C. Managed Database & Storage on Supabase
1. Create a new Supabase project in the region closest to your backend (e.g., Mumbai `ap-south-1` or Singapore `ap-southeast-1`).
2. Run database migration scripts from [`backend/scripts/supabase_schema.sql`](file:///e:/invoice-zamp/backend/scripts/supabase_schema.sql) in the Supabase SQL Editor.
3. Seed the master procurement records using [`backend/scripts/supabase_seed.sql`](file:///e:/invoice-zamp/backend/scripts/supabase_seed.sql).
4. Create a storage bucket named `ledgerflow-invoices` and set access policies for service-role read/write.

---

## 4. Docker Compose Orchestration (Self-Hosted)

Use the root [docker-compose.yml](file:///e:/invoice-zamp/docker-compose.yml) to deploy all components:

```bash
# 1. Build and start containers in detached mode
docker compose up -d --build

# 2. Check running services
docker compose ps

# 3. Seed initial master procurement data
docker compose exec backend python scripts/seed.py

# 4. View application logs
docker compose logs -f backend
```

---

## 5. Performance Verification & Health Checklist

Before signing off on a production deployment:

1. **Health Verification:**
   ```bash
   curl -s https://api.ledgerflow.yourdomain.com/api/health | jq .
   # Expected: {"status": "healthy", "service": "LedgerFlow API", ...}
   ```
2. **Cold vs Warm Cache Latency:**
   * Test `/api/purchase-orders` on cold start (< 4s) and repeat (< 10ms).
   * Test `/api/vendors` on cold start (< 3s) and repeat (< 5ms).
3. **Storage Upload Verification:**
   * Upload a test invoice from the frontend UI and confirm the object is created in the `ledgerflow-invoices` Supabase bucket.
4. **CORS Security:**
   * Ensure that only the verified frontend origin (`FRONTEND_URL`) is allowed to make cross-origin requests.
