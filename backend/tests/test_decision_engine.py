from decimal import Decimal
import pytest
from app.services.decision_engine import DecisionEngine, DecisionStatus, RuleStatus, RuleSeverity
from app.models.vendor import Vendor
from app.models.purchase_order import PurchaseOrder


@pytest.fixture
def happy_vendor():
    return Vendor(
        legal_name="Aster Office Supplies Pvt Ltd",
        vendor_code="V-001",
        status="APPROVED",
        tax_id="27ABCDE1234F1Z5",
    )


@pytest.fixture
def happy_po():
    return PurchaseOrder(
        po_number="PO-1001",
        currency="INR",
        po_total=Decimal("100000.00"),
        status="OPEN",
    )


@pytest.fixture
def happy_context(happy_vendor, happy_po):
    return {
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
        "vendor_match": {"matched": True, "vendor": happy_vendor, "tax_id_matches_master": True},
        "po_match": {
            "matched": True,
            "po": happy_po,
            "match_type": "exact",
            "vendor_matches": True,
            "currency_matches": True,
            "requires_review": False,
        },
        "business_duplicate": {"tier": None},
        "arithmetic_reconciliation": {
            "passes": True,
            "declared_total": Decimal("94400.00"),
            "calculated_total": Decimal("94400.00"),
        },
        "line_item_reconciliation": [],
        "po_balance": {
            "passes": True,
            "invoice_total": Decimal("94400.00"),
            "remaining_before": Decimal("100000.00"),
            "tolerance_warning": False,
        },
    }


def test_decision_engine_happy_path(happy_context):
    engine = DecisionEngine()
    result = engine.evaluate(happy_context)
    assert result["status"] == DecisionStatus.READY_FOR_AP_APPROVAL.value
    assert len(result["reason_codes"]) == 0
    assert "ready for Accounts Payable" in result["summary"]


def test_r001_invalid_pdf(happy_context):
    engine = DecisionEngine()
    happy_context["file_validation"] = {"valid": False, "error": "Corrupt header or unreadable PDF bytes"}
    result = engine.evaluate(happy_context)
    assert result["status"] == DecisionStatus.BLOCKED.value
    assert "R-001" in result["reason_codes"]


def test_r002_exact_duplicate(happy_context):
    engine = DecisionEngine()
    happy_context["exact_duplicate"] = {
        "is_duplicate": True,
        "existing_run_id": "abc-123",
        "message": "Exact file duplicate detected",
    }
    result = engine.evaluate(happy_context)
    assert result["status"] == DecisionStatus.BLOCKED.value
    assert "R-002" in result["reason_codes"]


def test_r003_non_invoice_document_type(happy_context):
    engine = DecisionEngine()
    happy_context["extraction"]["extraction"]["document_type"] = "price_quotation"
    result = engine.evaluate(happy_context)
    assert result["status"] == DecisionStatus.REVIEW_REQUIRED.value
    assert "R-003" in result["reason_codes"]


def test_r004_missing_required_fields(happy_context):
    engine = DecisionEngine()
    happy_context["extraction"]["invoice"]["number"] = None
    happy_context["extraction"]["amounts"]["grand_total"] = None
    result = engine.evaluate(happy_context)
    assert result["status"] == DecisionStatus.REVIEW_REQUIRED.value
    assert "R-004" in result["reason_codes"]


def test_r006_unresolved_vendor(happy_context):
    engine = DecisionEngine()
    happy_context["vendor_match"] = {"matched": False, "vendor": None, "message": "Unknown vendor"}
    result = engine.evaluate(happy_context)
    assert result["status"] == DecisionStatus.REVIEW_REQUIRED.value
    assert "R-006" in result["reason_codes"]


def test_r007_inactive_vendor(happy_context, happy_vendor):
    engine = DecisionEngine()
    happy_vendor.status = "INACTIVE"
    result = engine.evaluate(happy_context)
    assert result["status"] == DecisionStatus.BLOCKED.value
    assert "R-007" in result["reason_codes"]


def test_r007_unapproved_vendor(happy_context, happy_vendor):
    engine = DecisionEngine()
    happy_vendor.status = "UNAPPROVED"
    result = engine.evaluate(happy_context)
    assert result["status"] == DecisionStatus.BLOCKED.value
    assert "R-007" in result["reason_codes"]


def test_r008_tax_id_mismatch(happy_context):
    engine = DecisionEngine()
    happy_context["vendor_match"]["tax_id_matches_master"] = False
    happy_context["extraction"]["vendor"]["tax_id"] = "99INVOICE1234F1Z9"
    result = engine.evaluate(happy_context)
    assert result["status"] == DecisionStatus.REVIEW_REQUIRED.value
    assert "R-008" in result["reason_codes"]


def test_r009_missing_po_and_candidate_po(happy_context, happy_po):
    engine = DecisionEngine()
    happy_context["po_match"] = {
        "matched": True,
        "po": happy_po,
        "match_type": "candidate",
        "vendor_matches": True,
        "currency_matches": True,
        "requires_review": True,
    }
    result = engine.evaluate(happy_context)
    assert result["status"] == DecisionStatus.REVIEW_REQUIRED.value
    assert "R-009" in result["reason_codes"]


def test_r010_po_vendor_mismatch(happy_context):
    engine = DecisionEngine()
    happy_context["po_match"]["vendor_matches"] = False
    result = engine.evaluate(happy_context)
    assert result["status"] == DecisionStatus.BLOCKED.value
    assert "R-010" in result["reason_codes"]


def test_r011_po_currency_mismatch(happy_context):
    engine = DecisionEngine()
    happy_context["po_match"]["currency_matches"] = False
    happy_context["extraction"]["invoice"]["currency"] = "USD"
    result = engine.evaluate(happy_context)
    assert result["status"] == DecisionStatus.REVIEW_REQUIRED.value
    assert "R-011" in result["reason_codes"]


def test_r012_business_key_duplicate(happy_context):
    engine = DecisionEngine()
    happy_context["business_duplicate"] = {
        "tier": "business_key",
        "existing_run_id": "run-xyz-456",
        "message": "Duplicate invoice number for this vendor",
    }
    result = engine.evaluate(happy_context)
    assert result["status"] == DecisionStatus.BLOCKED.value
    assert "R-012" in result["reason_codes"]


def test_r013_arithmetic_discrepancy(happy_context):
    engine = DecisionEngine()
    happy_context["arithmetic_reconciliation"] = {
        "passes": False,
        "declared_total": Decimal("94400.00"),
        "calculated_total": Decimal("90000.00"),
        "variance": Decimal("4400.00"),
        "message": "Declared total does not match subtotal + tax",
    }
    result = engine.evaluate(happy_context)
    assert result["status"] == DecisionStatus.REVIEW_REQUIRED.value
    assert "R-013" in result["reason_codes"]


def test_r014_line_item_discrepancy(happy_context):
    engine = DecisionEngine()
    happy_context["line_item_reconciliation"] = [
        {"description": "Item A", "passes": True},
        {"description": "Item B", "passes": False, "declared": Decimal("500.00"), "calculated": Decimal("400.00")},
    ]
    result = engine.evaluate(happy_context)
    assert result["status"] == DecisionStatus.REVIEW_REQUIRED.value
    assert "R-014" in result["reason_codes"]


def test_r015_po_balance_exceeded(happy_context):
    engine = DecisionEngine()
    happy_context["po_balance"] = {
        "passes": False,
        "invoice_total": Decimal("105000.00"),
        "remaining_before": Decimal("100000.00"),
        "allowed_variance": Decimal("500.00"),
        "message": "Invoice total exceeds available PO balance plus tolerance cap",
    }
    result = engine.evaluate(happy_context)
    assert result["status"] == DecisionStatus.REVIEW_REQUIRED.value
    assert "R-015" in result["reason_codes"]


def test_r015_po_balance_within_tolerance_warning(happy_context):
    engine = DecisionEngine()
    happy_context["po_balance"] = {
        "passes": True,
        "invoice_total": Decimal("100300.00"),
        "remaining_before": Decimal("100000.00"),
        "allowed_variance": Decimal("500.00"),
        "tolerance_warning": True,
        "message": "Invoice exceeds PO balance by INR 300.00 but falls within allowed tolerance.",
    }
    result = engine.evaluate(happy_context)
    # Within tolerance is still allowed for approval, but flagged with warning
    assert result["status"] == DecisionStatus.READY_FOR_AP_APPROVAL.value
    r015 = next(r for r in result["rule_results"] if r["rule_id"] == "R-015")
    assert r015["status"] == RuleStatus.WARNING.value


def test_r016_cancelled_po(happy_context, happy_po):
    engine = DecisionEngine()
    happy_po.status = "CANCELLED"
    result = engine.evaluate(happy_context)
    assert result["status"] == DecisionStatus.BLOCKED.value
    assert "R-016" in result["reason_codes"]


def test_r016_closed_po(happy_context, happy_po):
    engine = DecisionEngine()
    happy_po.status = "CLOSED"
    result = engine.evaluate(happy_context)
    assert result["status"] == DecisionStatus.REVIEW_REQUIRED.value
    assert "R-016" in result["reason_codes"]


def test_multi_failure_priority_block_wins(happy_context, happy_vendor):
    """
    If an invoice has both a REVIEW failure (e.g. arithmetic error R-013)
    and a BLOCK failure (e.g. inactive vendor R-007),
    the top-level status must be BLOCKED, but BOTH failures must be preserved.
    """
    engine = DecisionEngine()
    happy_vendor.status = "INACTIVE"  # BLOCK (R-007)
    happy_context["arithmetic_reconciliation"] = {  # REVIEW (R-013)
        "passes": False,
        "declared_total": Decimal("94400.00"),
        "calculated_total": Decimal("90000.00"),
    }
    result = engine.evaluate(happy_context)
    assert result["status"] == DecisionStatus.BLOCKED.value
    assert "R-007" in result["reason_codes"]

    # Verify both rules are recorded in the audit trail
    all_failed_rules = [r["rule_id"] for r in result["rule_results"] if r["status"] == RuleStatus.FAIL.value]
    assert "R-007" in all_failed_rules
    assert "R-013" in all_failed_rules
