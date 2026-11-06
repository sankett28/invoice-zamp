import pytest
import uuid
from datetime import date
from decimal import Decimal
from app.services.duplicate_detector import normalise_invoice_number, DuplicateDetector
from app.models.invoice_run import InvoiceRun
from app.database import async_session_factory


def test_normalise_invoice_number():
    assert normalise_invoice_number("AST-2026-041") == "ast2026041"
    assert normalise_invoice_number("ast 2026 041") == "ast2026041"
    assert normalise_invoice_number("000AST-2026-041") == "ast2026041"
    assert normalise_invoice_number("INV/2026/00123") == "inv202600123"
    assert normalise_invoice_number("INV - 999") == "inv999"
    assert normalise_invoice_number("00000456") == "456"
    assert normalise_invoice_number(None) == ""
    assert normalise_invoice_number("") == ""


@pytest.mark.asyncio
async def test_check_exact_file_duplicate():
    detector = DuplicateDetector()
    test_hash = "unique_hash_" + uuid.uuid4().hex

    async with async_session_factory() as db:
        # Before inserting, it should not be a duplicate
        res1 = await detector.check_exact_file(test_hash, current_run_id=None, db=db)
        assert res1["is_duplicate"] is False

        # Insert a run with this hash
        run = InvoiceRun(
            id=uuid.uuid4(),
            original_filename="test.pdf",
            file_storage_path="/storage/test.pdf",
            file_sha256=test_hash,
            file_size_bytes=1024,
            processing_state="COMPLETED",
        )
        db.add(run)
        await db.commit()

        # Now it should be detected as a duplicate
        res2 = await detector.check_exact_file(test_hash, current_run_id=None, db=db)
        assert res2["is_duplicate"] is True
        assert res2["existing_run_id"] == run.id


@pytest.mark.asyncio
async def test_check_business_key_duplicate():
    detector = DuplicateDetector()
    vendor_id = uuid.uuid4()
    inv_num_1 = "INV-2026-009"
    inv_num_2 = "inv 2026 009"  # Equivalent normalized format

    async with async_session_factory() as db:
        # Create an initial completed run
        run1 = InvoiceRun(
            id=uuid.uuid4(),
            original_filename="inv1.pdf",
            file_storage_path="/storage/inv1.pdf",
            file_sha256="hash1_" + uuid.uuid4().hex,
            file_size_bytes=1024,
            processing_state="COMPLETED",
            decision_status="READY_FOR_AP_APPROVAL",
            vendor_id=vendor_id,
            invoice_number=inv_num_1,
            invoice_number_normalised=normalise_invoice_number(inv_num_1),
        )
        db.add(run1)
        await db.commit()

        current_run_id = uuid.uuid4()
        # Check matching normalized invoice number under same vendor
        dup_check = await detector.check_business_duplicate(
            vendor_id=vendor_id,
            invoice_number=inv_num_2,
            invoice_date=date(2026, 10, 30),
            grand_total=Decimal("5000.00"),
            current_run_id=current_run_id,
            db=db,
        )
        assert dup_check["tier"] == "business_key"
        assert dup_check["existing_run_id"] == run1.id

        # Check different invoice number under same vendor
        diff_check = await detector.check_business_duplicate(
            vendor_id=vendor_id,
            invoice_number="INV-2026-999",
            invoice_date=date(2026, 10, 30),
            grand_total=Decimal("5000.00"),
            current_run_id=current_run_id,
            db=db,
        )
        assert diff_check["tier"] is None
