import os
import pytest
from app.services.pdf_extractor import PDFExtractor
from app.services.duplicate_detector import DuplicateDetector
from app.services.vendor_matcher import VendorMatcher
from app.services.po_matcher import POMatcher
from app.services.reconciliation import reconcile_invoice_arithmetic, calculate_po_balance
from app.services.decision_engine import DecisionEngine, DecisionStatus

PDF_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../sample_data/invoices"))


@pytest.mark.asyncio
async def test_happy_path_pipeline():
    extractor = PDFExtractor()
    happy_pdf_path = os.path.join(PDF_DIR, "invoice_happy_path.pdf")
    assert os.path.exists(happy_pdf_path), "Happy path PDF fixture must exist"

    with open(happy_pdf_path, "rb") as f:
        pdf_bytes = f.read()

    # 1. Validation
    val = extractor.validate_pdf(pdf_bytes)
    assert val["valid"] is True
    assert val["page_count"] == 1

    # 2. SHA-256
    sha256 = extractor.compute_sha256(pdf_bytes)
    assert len(sha256) == 64

    # 3. Text Extraction
    text_res = extractor.extract_text(pdf_bytes)
    assert text_res["total_chars"] > 50
    assert "Aster Office Supplies" in text_res["full_text"]
    assert "PO-1001" in text_res["full_text"]
    assert "94,400.00" in text_res["full_text"]

    # 4. Arithmetic reconciliation
    from decimal import Decimal
    arith = reconcile_invoice_arithmetic(
        subtotal=Decimal("80000.00"),
        tax_total=Decimal("14400.00"),
        discount_total=Decimal("0.00"),
        shipping_total=Decimal("0.00"),
        grand_total=Decimal("94400.00"),
    )
    assert arith["passes"] is True

    # 5. PO Balance
    bal = calculate_po_balance(
        po_total=Decimal("100000.00"),
        prior_committed=Decimal("0.00"),
        invoice_total=Decimal("94400.00"),
    )
    assert bal["passes"] is True
    assert bal["remaining_after"] == Decimal("5600.00")
