import uuid
from decimal import Decimal
import pytest
from app.services.po_matcher import POMatcher
from app.models.vendor import Vendor
from app.models.purchase_order import PurchaseOrder
from app.models.invoice_run import InvoiceRun
from app.database import async_session_factory
from sqlalchemy import select


@pytest.mark.asyncio
async def test_exact_po_match():
    matcher = POMatcher()
    async with async_session_factory() as db:
        # Find vendor V-001
        res = await db.execute(select(Vendor).where(Vendor.vendor_code == "V-001"))
        v1 = res.scalars().first()

        match = await matcher.match_po(
            po_number="PO-1001",
            vendor_id=v1.id,
            currency="INR",
            invoice_total=Decimal("94400.00"),
            db=db,
        )

        assert match["matched"] is True
        assert match["match_type"] == "exact"
        assert match["po"].po_number == "PO-1001"
        assert match["vendor_matches"] is True
        assert match["currency_matches"] is True
        assert match["requires_review"] is False


@pytest.mark.asyncio
async def test_po_not_found():
    matcher = POMatcher()
    async with async_session_factory() as db:
        match = await matcher.match_po(
            po_number="PO-NONEXISTENT-9999",
            vendor_id=uuid.uuid4(),
            currency="INR",
            invoice_total=Decimal("1000.00"),
            db=db,
        )
        assert match["matched"] is False
        assert match["requires_review"] is True


@pytest.mark.asyncio
async def test_po_vendor_mismatch():
    matcher = POMatcher()
    async with async_session_factory() as db:
        # Fetch vendor V-002 (Northstar)
        res = await db.execute(select(Vendor).where(Vendor.vendor_code == "V-002"))
        v2 = res.scalars().first()

        # Try to match PO-1001 (which belongs to Aster V-001) against Northstar (V-002)
        match = await matcher.match_po(
            po_number="PO-1001",
            vendor_id=v2.id,
            currency="INR",
            invoice_total=Decimal("1000.00"),
            db=db,
        )
        assert match["matched"] is True
        assert match["vendor_matches"] is False
        assert match["requires_review"] is True


@pytest.mark.asyncio
async def test_candidate_po_search_when_po_number_missing():
    matcher = POMatcher()
    async with async_session_factory() as db:
        # Northstar V-002 has PO-2001 (100k), PO-2002 (80k), PO-2003 (75k)
        res = await db.execute(select(Vendor).where(Vendor.vendor_code == "V-002"))
        v2 = res.scalars().first()

        match = await matcher.match_po(
            po_number=None,
            vendor_id=v2.id,
            currency="INR",
            invoice_total=Decimal("80000.00"),
            db=db,
        )

        assert match["matched"] is True
        assert match["match_type"] == "candidate"
        assert len(match["candidates"]) > 0
        assert match["requires_review"] is True
        # PO-2002 has exact 80,000 total, so it should be ranked first
        assert match["candidates"][0]["po_number"] == "PO-2002"


@pytest.mark.asyncio
async def test_po_remaining_balance_idempotent_calculation():
    matcher = POMatcher()
    async with async_session_factory() as db:
        # Find PO-1001 (Total = 100,000)
        res = await db.execute(select(PurchaseOrder).where(PurchaseOrder.po_number == "PO-1001"))
        po = res.scalars().first()

        prior, remaining = await matcher.get_remaining_balance(po.id, None, db)
        assert po.po_total == Decimal("100000.00")
        assert prior + remaining == Decimal("100000.00")
