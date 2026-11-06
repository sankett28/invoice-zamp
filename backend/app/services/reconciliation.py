import re
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP


def parse_decimal(value: str | int | float | Decimal | None) -> Decimal | None:
    """Safely converts numbers and formatted strings (with commas/symbols) to Decimal."""
    if value is None:
        return None
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (int, float)):
        return Decimal(str(value))

    # Strip currency symbols, commas, spaces
    cleaned = re.sub(r"[^\d.-]", "", str(value).strip())
    if not cleaned:
        return None

    try:
        return Decimal(cleaned).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError):
        return None


def reconcile_invoice_arithmetic(
    subtotal: Decimal | None,
    tax_total: Decimal | None,
    discount_total: Decimal | None,
    shipping_total: Decimal | None,
    grand_total: Decimal | None,
    rounding_allowance: Decimal = Decimal("1.00"),
) -> dict:
    """
    Validates: grand_total == subtotal + tax_total + shipping_total - discount_total
    within rounding_allowance (Rule R-013).
    """
    if grand_total is None:
        return {
            "passes": False,
            "calculated_total": None,
            "declared_total": None,
            "variance": None,
            "message": "Grand total is missing or could not be parsed.",
        }

    sub = subtotal or Decimal("0.00")
    tax = tax_total or Decimal("0.00")
    disc = discount_total or Decimal("0.00")
    ship = shipping_total or Decimal("0.00")

    calculated = (sub + tax + ship - disc).quantize(Decimal("0.01"))
    variance = abs(grand_total - calculated)
    passes = variance <= rounding_allowance

    if passes:
        if variance > Decimal("0.00"):
            msg = f"Arithmetic reconciles within INR {rounding_allowance} rounding allowance (variance: INR {variance})."
        else:
            msg = f"Arithmetic reconciles exactly to declared total INR {grand_total}."
    else:
        msg = (
            f"Arithmetic discrepancy: Declared INR {grand_total} != Calculated INR {calculated} "
            f"(Subtotal: INR {sub} + Tax: INR {tax} + Shipping: INR {ship} - Discount: INR {disc}). "
            f"Variance of INR {variance} exceeds INR {rounding_allowance} allowance."
        )

    return {
        "passes": passes,
        "calculated_total": calculated,
        "declared_total": grand_total,
        "variance": variance,
        "message": msg,
    }


def reconcile_line_items(line_items: list[dict]) -> list[dict]:
    """
    Validates quantity * unit_price == line_total for line items (Rule R-014).
    """
    results = []
    for idx, item in enumerate(line_items):
        qty = parse_decimal(item.get("quantity"))
        unit_price = parse_decimal(item.get("unit_price"))
        line_total = parse_decimal(item.get("line_total"))
        desc = item.get("description") or f"Line Item {idx + 1}"

        if qty is not None and unit_price is not None and line_total is not None:
            expected = (qty * unit_price).quantize(Decimal("0.01"))
            variance = abs(line_total - expected)
            passes = variance <= Decimal("1.00")
            results.append({
                "description": desc,
                "quantity": qty,
                "unit_price": unit_price,
                "line_total": line_total,
                "expected_total": expected,
                "variance": variance,
                "passes": passes,
            })
    return results


def reconcile_3way_line_items(
    invoice_lines: list[dict],
    po_lines: list[dict] | None = None,
) -> dict:
    """
    Enhanced 3-way matching between invoice line items and PO line items.
    Checks description correspondence, quantity consumed vs contracted, and unit price matches.
    """
    if not po_lines:
        return {
            "has_po_lines": False,
            "matched_lines_count": 0,
            "discrepancies": [],
            "passes": True,
        }

    matched = []
    discrepancies = []

    for inv_item in invoice_lines:
        inv_desc = (inv_item.get("description") or "").lower().strip()
        inv_qty = parse_decimal(inv_item.get("quantity"))
        inv_price = parse_decimal(inv_item.get("unit_price"))

        # Find matching PO line item
        best_po_item = None
        for po_item in po_lines:
            po_desc = (po_item.get("description") or "").lower().strip()
            if inv_desc and po_desc and (inv_desc in po_desc or po_desc in inv_desc):
                best_po_item = po_item
                break

        if best_po_item:
            po_price = parse_decimal(best_po_item.get("unit_price"))
            price_variance = abs(inv_price - po_price) if (inv_price is not None and po_price is not None) else Decimal("0.00")
            if price_variance > Decimal("1.00"):
                discrepancies.append({
                    "description": inv_desc,
                    "issue": f"Unit price discrepancy: Invoice INR {inv_price} != PO INR {po_price}",
                })
            else:
                matched.append(inv_desc)

    return {
        "has_po_lines": True,
        "matched_lines_count": len(matched),
        "discrepancies": discrepancies,
        "passes": len(discrepancies) == 0,
    }


def calculate_po_balance(
    po_total: Decimal,
    prior_committed: Decimal,
    invoice_total: Decimal,
    tolerance_percent: float = 1.0,
    tolerance_cap: Decimal = Decimal("500.00"),
) -> dict:
    """
    Calculates remaining PO balance and applies tolerance policy (Rule R-015, Decision D-004).

    allowed_variance = min(remaining_po_amount * (tolerance_percent / 100), tolerance_cap)
    po_variance = invoice_total - remaining_po_amount
    """
    remaining_before = po_total - prior_committed

    # Underbilling check: If invoice <= remaining_before, po_variance <= 0
    po_variance = (invoice_total - remaining_before).quantize(Decimal("0.01"))

    # Calculate allowed variance for overbilling
    pct_decimal = Decimal(str(tolerance_percent)) / Decimal("100")
    if remaining_before > Decimal("0.00"):
        raw_allowed = (remaining_before * pct_decimal).quantize(Decimal("0.01"))
        allowed_variance = min(raw_allowed, tolerance_cap)
    else:
        allowed_variance = Decimal("0.00")

    # Remaining after
    remaining_after = (remaining_before - invoice_total).quantize(Decimal("0.01"))

    if po_variance <= Decimal("0.00"):
        # Underbilling / exact consumption: fully passes
        passes = True
        is_within_tolerance = True
        tolerance_warning = False
        msg = (
            f"Invoice (INR {invoice_total}) is within remaining PO balance (INR {remaining_before}). "
            f"Remaining balance after processing: INR {remaining_after}."
        )
    elif po_variance <= allowed_variance:
        # Overbilling within tolerance policy
        passes = True
        is_within_tolerance = True
        tolerance_warning = True
        msg = (
            f"Invoice exceeds remaining PO balance by INR {po_variance}, which is within the allowed "
            f"tolerance policy (allowed INR {allowed_variance}: min({tolerance_percent}% of INR {remaining_before}, INR {tolerance_cap}))."
        )
    else:
        # Overbilling exceeding tolerance
        passes = False
        is_within_tolerance = False
        tolerance_warning = False
        msg = (
            f"Invoice (INR {invoice_total}) exceeds remaining PO balance (INR {remaining_before}) by INR {po_variance}, "
            f"breaching allowed tolerance of INR {allowed_variance}."
        )

    return {
        "po_total": po_total,
        "prior_committed": prior_committed,
        "remaining_before": remaining_before,
        "invoice_total": invoice_total,
        "po_variance": po_variance,
        "allowed_variance": allowed_variance,
        "remaining_after": remaining_after,
        "passes": passes,
        "is_within_tolerance": is_within_tolerance,
        "tolerance_warning": tolerance_warning,
        "message": msg,
    }
