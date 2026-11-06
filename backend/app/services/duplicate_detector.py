import re
import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.invoice_run import InvoiceRun


def normalise_invoice_number(invoice_number: str | None) -> str:
    """
    Normalises invoice number for duplicate comparison by:
    - Lowercasing
    - Removing whitespace, hyphens, slashes, underscores
    - Stripping leading zeroes
    """
    if not invoice_number:
        return ""
    # Lowercase & strip whitespace/separators
    s = re.sub(r"[\s\-_/]+", "", invoice_number.lower())
    # Strip leading zeroes from numeric parts
    s = re.sub(r"^0+", "", s)
    return s


class DuplicateDetector:
    async def check_exact_file(
        self,
        sha256: str,
        current_run_id: uuid.UUID | None,
        db: AsyncSession,
    ) -> dict:
        """
        Tier 1 check: Exact file hash matching.
        """
        stmt = select(InvoiceRun).where(
            InvoiceRun.file_sha256 == sha256,
            InvoiceRun.processing_state != "FAILED",
        )
        if current_run_id:
            stmt = stmt.where(InvoiceRun.id != current_run_id)

        res = await db.execute(stmt)
        existing = res.scalars().first()

        if existing:
            return {
                "is_duplicate": True,
                "tier": "exact_file",
                "existing_run_id": existing.id,
                "message": (
                    f"Exact file duplicate detected. This identical PDF was processed in Run "
                    f"{existing.id} on {existing.created_at.strftime('%Y-%m-%d %H:%M')}."
                ),
            }

        return {"is_duplicate": False, "tier": None, "existing_run_id": None, "message": ""}

    async def check_business_duplicate(
        self,
        vendor_id: uuid.UUID | None,
        invoice_number: str | None,
        invoice_date: date | None,
        grand_total: Decimal | None,
        current_run_id: uuid.UUID | None,
        db: AsyncSession,
    ) -> dict:
        """
        Tiers 2 & 3 check: Business-key and heuristic duplicate detection.
        """
        if not vendor_id:
            return {"tier": None, "existing_run_id": None, "message": ""}

        norm_num = normalise_invoice_number(invoice_number)

        # Tier 2: Same vendor + same normalised invoice number
        if norm_num:
            stmt = select(InvoiceRun).where(
                InvoiceRun.vendor_id == vendor_id,
                InvoiceRun.invoice_number_normalised == norm_num,
                InvoiceRun.decision_status != "BLOCKED",
                InvoiceRun.processing_state != "FAILED",
            )
            if current_run_id:
                stmt = stmt.where(InvoiceRun.id != current_run_id)

            res = await db.execute(stmt)
            existing = res.scalars().first()
            if existing:
                return {
                    "tier": "business_key",
                    "existing_run_id": existing.id,
                    "message": (
                        f"Business duplicate detected: Invoice number '{invoice_number}' for this vendor "
                        f"was already processed in Run {existing.id} (Status: {existing.decision_status})."
                    ),
                }

        # Tier 3: Same vendor + same amount + same date (Heuristic possible duplicate)
        if grand_total and invoice_date:
            stmt = select(InvoiceRun).where(
                InvoiceRun.vendor_id == vendor_id,
                InvoiceRun.grand_total == grand_total,
                InvoiceRun.invoice_date == invoice_date,
                InvoiceRun.processing_state != "FAILED",
            )
            if current_run_id:
                stmt = stmt.where(InvoiceRun.id != current_run_id)

            res = await db.execute(stmt)
            existing = res.scalars().first()
            if existing and existing.id != current_run_id:
                return {
                    "tier": "possible",
                    "existing_run_id": existing.id,
                    "message": (
                        f"Possible duplicate: Another invoice for identical amount (INR {grand_total}) "
                        f"and date ({invoice_date}) exists in Run {existing.id}. Human review required."
                    ),
                }

        return {"tier": None, "existing_run_id": None, "message": ""}
