import uuid
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.purchase_order import PurchaseOrder
from app.models.invoice_run import InvoiceRun


class POMatcher:
    async def match_po(
        self,
        po_number: str | None,
        vendor_id: uuid.UUID | None,
        currency: str | None,
        invoice_total: Decimal | None,
        db: AsyncSession,
    ) -> dict:
        """
        Matches invoice to Purchase Order.
        Returns:
            {
                "matched": bool,
                "po": PurchaseOrder | None,
                "match_type": "exact" | "candidate" | None,
                "candidates": list[dict],
                "vendor_matches": bool | None,
                "currency_matches": bool | None,
                "status_valid": bool | None,
                "requires_review": bool,
                "message": str
            }
        """
        # Case 1: Explicit PO number on invoice
        if po_number and po_number.strip():
            clean_po = po_number.strip()
            stmt = select(PurchaseOrder).where(PurchaseOrder.po_number.ilike(clean_po))
            res = await db.execute(stmt)
            po = res.scalars().first()

            if not po:
                return {
                    "matched": False,
                    "po": None,
                    "match_type": None,
                    "candidates": [],
                    "vendor_matches": None,
                    "currency_matches": None,
                    "status_valid": None,
                    "requires_review": True,
                    "message": f"Referenced PO '{clean_po}' does not exist in procurement master.",
                }

            # Check vendor ownership
            vendor_matches = (vendor_id is not None and po.vendor_id == vendor_id)
            # Check currency match
            curr_matches = (currency is None or po.currency.upper() == currency.upper())
            # Check status
            status_valid = po.status in ("OPEN", "PARTIALLY_INVOICED")

            requires_review = not (vendor_matches and curr_matches and status_valid)

            return {
                "matched": True,
                "po": po,
                "match_type": "exact",
                "candidates": [],
                "vendor_matches": vendor_matches,
                "currency_matches": curr_matches,
                "status_valid": status_valid,
                "requires_review": requires_review,
                "message": f"Exact PO match for '{clean_po}'.",
            }

        # Case 2: No explicit PO number provided -> Candidate Search (EC-3)
        if not vendor_id:
            return {
                "matched": False,
                "po": None,
                "match_type": None,
                "candidates": [],
                "vendor_matches": None,
                "currency_matches": None,
                "status_valid": None,
                "requires_review": True,
                "message": "No PO reference on invoice, and vendor could not be resolved to search candidates.",
            }

        # Search open POs for this vendor
        stmt = select(PurchaseOrder).where(
            PurchaseOrder.vendor_id == vendor_id,
            PurchaseOrder.status.in_(["OPEN", "PARTIALLY_INVOICED"]),
        )
        res = await db.execute(stmt)
        vendor_pos = res.scalars().all()

        if not vendor_pos:
            return {
                "matched": False,
                "po": None,
                "match_type": None,
                "candidates": [],
                "vendor_matches": None,
                "currency_matches": None,
                "status_valid": None,
                "requires_review": True,
                "message": "No PO number provided, and no open purchase orders found for this vendor.",
            }

        candidates = []
        for p in vendor_pos:
            # Score candidate based on amount similarity
            score = 0.5
            reasons = ["Same approved vendor", f"Status is {p.status}"]

            if currency and p.currency.upper() == currency.upper():
                score += 0.2
                reasons.append(f"Currency matches ({p.currency})")

            if invoice_total and p.po_total:
                diff = abs(Decimal(str(p.po_total)) - invoice_total)
                if diff <= Decimal("1000.00"):
                    score += 0.25
                    reasons.append(f"Amount closely matches (PO: INR {p.po_total}, Inv: INR {invoice_total})")
                elif invoice_total <= Decimal(str(p.po_total)):
                    score += 0.15
                    reasons.append(f"Invoice fits within PO total (INR {p.po_total})")

            candidates.append({
                "po": p,
                "po_number": p.po_number,
                "po_total": str(p.po_total),
                "score": round(score, 2),
                "reasons": reasons,
            })

        # Sort candidates descending by score
        candidates.sort(key=lambda x: x["score"], reverse=True)

        # Per Decision D-005: candidate POs ALWAYS require human confirmation
        top_candidate = candidates[0]["po"] if candidates else None

        return {
            "matched": bool(candidates),
            "po": top_candidate,
            "match_type": "candidate",
            "candidates": candidates,
            "vendor_matches": True,
            "currency_matches": True,
            "status_valid": True,
            "requires_review": True,  # Per Decision D-005, human confirm is required
            "message": f"Found {len(candidates)} candidate purchase order(s). Reviewer confirmation required.",
        }

    async def get_remaining_balance(
        self,
        po_id: uuid.UUID,
        current_run_id: uuid.UUID | None,
        db: AsyncSession,
    ) -> tuple[Decimal, Decimal]:
        """
        Calculates:
        (prior_committed_amount, remaining_po_amount)
        based on all runs against this PO with decision_status='READY_FOR_AP_APPROVAL',
        excluding current_run_id.
        """
        # 1. Fetch PO total
        po_stmt = select(PurchaseOrder.po_total).where(PurchaseOrder.id == po_id)
        po_res = await db.execute(po_stmt)
        po_total = po_res.scalar_one_or_none()
        if po_total is None:
            return Decimal("0.00"), Decimal("0.00")
        po_total_dec = Decimal(str(po_total))

        # 2. Sum committed amounts
        sum_stmt = select(func.coalesce(func.sum(InvoiceRun.grand_total), 0)).where(
            InvoiceRun.purchase_order_id == po_id,
            InvoiceRun.decision_status == "READY_FOR_AP_APPROVAL",
        )
        if current_run_id:
            sum_stmt = sum_stmt.where(InvoiceRun.id != current_run_id)

        sum_res = await db.execute(sum_stmt)
        prior_committed = Decimal(str(sum_res.scalar_one()))
        remaining_balance = po_total_dec - prior_committed

        return prior_committed, remaining_balance
