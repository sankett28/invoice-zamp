# LedgerFlow — Production Deployment Runbook

This guide describes how to deploy LedgerFlow in containerized staging and production environments with PostgreSQL and S3 / Supabase object storage.

---

## 1. Prerequisites & Environment Matrix

- **Operating System:** Linux (Ubuntu 22.04+ / Debian 12) or Windows Server
- **Runtime:** Python 3.11+, Node.js 18+
- **Database:** PostgreSQL 15+ (with native UUID & JSONB support)
- **OCR Engine:** Tesseract OCR 5.x (`tesseract-ocr`, `tesseract-ocr-eng`)

---

## 2. Production Environment Variables (`.env`)

```ini
# =============================================================================
# LedgerFlow Production Settings
# =============================================================================

# LLM Extractor (Primary: Groq Qwen3.8-27B)
LLM_PRIMARY_PROVIDER=groq
LLM_PRIMARY_MODEL=qwen/qwen3.8-27b
GROQ_API_KEY=gsk_your_groq_production_key_here

# LLM Extractor (Fallback: Google Gemini 3.8 Flash)
LLM_FALLBACK_PROVIDER=gemini
LLM_FALLBACK_MODEL=gemini-3.8-flash
GEMINI_API_KEY=AIzaSy_your_gemini_production_key_here

# Database (PostgreSQL Connection Pooling)
DATABASE_URL=postgresql+asyncpg://postgres:secure_db_pass@db.internal:5432/ledgerflow

# Object Storage (AWS S3 or Supabase)
STORAGE_BACKEND=s3
S3_BUCKET=ledgerflow-enterprise-invoices
S3_REGION=ap-south-1
S3_ACCESS_KEY=AKIA_YOUR_AWS_ACCESS_KEY
S3_SECRET_KEY=YOUR_AWS_SECRET_ACCESS_KEY

# Application Policies
TOLERANCE_PERCENT=1.0
TOLERANCE_CAP_INR=500.0
ROUNDING_ALLOWANCE_INR=1.0

# CORS & Networking
FRONTEND_URL=https://ledgerflow.company.internal
APP_PORT=8000
APP_ENV=production
```

---

## 3. Docker Compose Orchestration

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

## 4. Tesseract OCR Host Setup (For Scanned PDFs)

When deploying on bare-metal or customized Linux images:

```bash
# Debian / Ubuntu
sudo apt-get update && sudo apt-get install -y tesseract-ocr tesseract-ocr-eng libtesseract-dev

# Verify Tesseract installation
tesseract --version
```

---

## 5. High Availability & Backup Procedures

1. **Database Backups:**
   ```bash
   pg_dump -U postgres -h db.internal -d ledgerflow -F c -b -v -f /backups/ledgerflow_$(date +%Y%m%d_%H%M%S).dump
   ```
2. **Object Storage Lifecycle:**
   - Configure S3 lifecycle policies to transition invoice documents older than 365 days to S3 Glacier Flexible Retrieval for audit retention compliance.
3. **Database Resets (Staging/Demo only):**
   ```bash
   python scripts/seed.py --reset
   ```
