from decimal import Decimal
from app.services.reconciliation import (
    parse_decimal,
    reconcile_invoice_arithmetic,
    calculate_po_balance,
)


def test_parse_decimal():
    assert parse_decimal("1,000.50") == Decimal("1000.50")
    assert parse_decimal("₹94,400.00") == Decimal("94400.00")
    assert parse_decimal(80000) == Decimal("80000.00")
    assert parse_decimal(None) is None
    assert parse_decimal("invalid") is None


def test_reconcile_invoice_arithmetic_exact_match():
    res = reconcile_invoice_arithmetic(
        subtotal=Decimal("80000.00"),
        tax_total=Decimal("14400.00"),
        discount_total=Decimal("0.00"),
        shipping_total=Decimal("0.00"),
        grand_total=Decimal("94400.00"),
        rounding_allowance=Decimal("1.00"),
    )
    assert res["passes"] is True
    assert res["variance"] == Decimal("0.00")


def test_reconcile_invoice_arithmetic_within_rounding_allowance():
    # 0.50 difference
    res = reconcile_invoice_arithmetic(
        subtotal=Decimal("80000.00"),
        tax_total=Decimal("14400.50"),
        discount_total=Decimal("0.00"),
        shipping_total=Decimal("0.00"),
        grand_total=Decimal("94400.00"),
        rounding_allowance=Decimal("1.00"),
    )
    assert res["passes"] is True
    assert res["variance"] == Decimal("0.50")


def test_reconcile_invoice_arithmetic_exceeds_allowance():
    # 500 difference
    res = reconcile_invoice_arithmetic(
        subtotal=Decimal("80000.00"),
        tax_total=Decimal("14400.00"),
        discount_total=Decimal("0.00"),
        shipping_total=Decimal("0.00"),
        grand_total=Decimal("94900.00"),
        rounding_allowance=Decimal("1.00"),
    )
    assert res["passes"] is False
    assert res["variance"] == Decimal("500.00")


def test_po_balance_underbilling():
    # Underbilling: invoice < remaining balance
    res = calculate_po_balance(
        po_total=Decimal("100000.00"),
        prior_committed=Decimal("0.00"),
        invoice_total=Decimal("40000.00"),
        tolerance_percent=1.0,
        tolerance_cap=Decimal("500.00"),
    )
    assert res["passes"] is True
    assert res["is_within_tolerance"] is True
    assert res["tolerance_warning"] is False
    assert res["remaining_after"] == Decimal("60000.00")


def test_po_balance_within_tolerance():
    # Overbilling within 1% / ₹500 cap
    # Remaining: 50,000. 1% is 500. Cap is 500.
    # Invoice: 50,300 (overage: 300)
    res = calculate_po_balance(
        po_total=Decimal("100000.00"),
        prior_committed=Decimal("50000.00"),
        invoice_total=Decimal("50300.00"),
        tolerance_percent=1.0,
        tolerance_cap=Decimal("500.00"),
    )
    assert res["passes"] is True
    assert res["is_within_tolerance"] is True
    assert res["tolerance_warning"] is True
    assert res["allowed_variance"] == Decimal("500.00")


def test_po_balance_exceeding_tolerance():
    # Overbilling exceeding cap: 50,000 remaining, invoice 51,000 (1000 over > 500 cap)
    res = calculate_po_balance(
        po_total=Decimal("100000.00"),
        prior_committed=Decimal("50000.00"),
        invoice_total=Decimal("51000.00"),
        tolerance_percent=1.0,
        tolerance_cap=Decimal("500.00"),
    )
    assert res["passes"] is False
    assert res["is_within_tolerance"] is False
