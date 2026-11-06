from decimal import Decimal
from app.services.decision_engine import DecisionEngine, DecisionStatus, RuleStatus
from app.models.vendor import Vendor
from app.models.purchase_order import PurchaseOrder


def test_decision_engine_happy_path():
    engine = DecisionEngine()
    vendor = Vendor(
        legal_name="Aster Office Supplies Pvt Ltd",
        vendor_code="V-001",
        status="APPROVED",
        tax_id="27ABCDE1234F1Z5",
    )
    po = PurchaseOrder(
        po_number="PO-1001",
        currency="INR",
        po_total=Decimal("100000.00"),
        status="OPEN",
    )

    context = {
        "file_validation": {"valid": True, "page_count": 1},
        "exact_duplicate": {"is_duplicate": False},
        "extraction": {
            "invoice": {"number": "AST-2026-041", "date": "2026-10-30", "currency": "INR", "po_number": "PO-1001"},
            "vendor": {"name": "Aster Office Supplies Pvt Ltd", "tax_id": "27ABCDE1234F1Z5"},
            "amounts": {"grand_total": "94400.00", "subtotal": "80000.00", "tax_total": "14400.00"},
            "extraction": {"document_type": "invoice"},
            "evidence": {
                "invoice_number": {"raw_text": "AST-2026-041"},
                "grand_total": {"raw_text": "94400.00"},
            },
        },
        "vendor_match": {"matched": True, "vendor": vendor, "tax_id_matches_master": True},
        "po_match": {"matched": True, "po": po, "match_type": "exact", "vendor_matches": True, "currency_matches": True, "requires_review": False},
        "business_duplicate": {"tier": None},
        "arithmetic_reconciliation": {"passes": True, "declared_total": Decimal("94400.00"), "calculated_total": Decimal("94400.00")},
        "line_item_reconciliation": [],
        "po_balance": {"passes": True, "invoice_total": Decimal("94400.00"), "remaining_before": Decimal("100000.00"), "tolerance_warning": False},
    }

    result = engine.evaluate(context)
    assert result["status"] == DecisionStatus.READY_FOR_AP_APPROVAL.value


def test_decision_engine_blocked_on_duplicate():
    engine = DecisionEngine()
    context = {
        "file_validation": {"valid": True},
        "exact_duplicate": {"is_duplicate": True, "existing_run_id": "some-id", "message": "Duplicate file"},
        "extraction": {},
        "vendor_match": {"matched": False},
        "po_match": {"matched": False},
        "business_duplicate": {"tier": None},
        "arithmetic_reconciliation": {"passes": True},
        "po_balance": {},
    }
    result = engine.evaluate(context)
    assert result["status"] == DecisionStatus.BLOCKED.value


def test_decision_engine_review_on_missing_po():
    engine = DecisionEngine()
    vendor = Vendor(
        legal_name="Aster Office Supplies Pvt Ltd",
        vendor_code="V-001",
        status="APPROVED",
    )
    po = PurchaseOrder(
        po_number="PO-2002",
        currency="INR",
        po_total=Decimal("80000.00"),
        status="OPEN",
    )
    context = {
        "file_validation": {"valid": True},
        "exact_duplicate": {"is_duplicate": False},
        "extraction": {
            "invoice": {"number": "AST-2026-041", "date": "2026-10-30", "currency": "INR", "po_number": None},
            "vendor": {"name": "Aster Office Supplies Pvt Ltd"},
            "amounts": {"grand_total": "80000.00"},
            "extraction": {"document_type": "invoice"},
            "evidence": {
                "invoice_number": {"raw_text": "AST-2026-041"},
                "grand_total": {"raw_text": "80000.00"},
            },
        },
        "vendor_match": {"matched": True, "vendor": vendor},
        "po_match": {
            "matched": True,
            "po": po,
            "match_type": "candidate",  # Candidate PO should trigger review
            "vendor_matches": True,
            "currency_matches": True,
            "requires_review": True,
        },
        "business_duplicate": {"tier": None},
        "arithmetic_reconciliation": {"passes": True},
        "line_item_reconciliation": [],
        "po_balance": {"passes": True},
    }
    result = engine.evaluate(context)
    assert result["status"] == DecisionStatus.REVIEW_REQUIRED.value
