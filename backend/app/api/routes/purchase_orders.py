import uuid
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.purchase_order import PurchaseOrder
from app.schemas.purchase_order import PurchaseOrderResponse
from app.services.po_matcher import POMatcher

router = APIRouter(prefix="/api/purchase-orders", tags=["purchase-orders"])
po_matcher = POMatcher()


@router.get("", response_model=list[PurchaseOrderResponse])
@router.get("/", response_model=list[PurchaseOrderResponse])
async def list_purchase_orders(
    vendor_id: uuid.UUID | None = Query(None),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PurchaseOrder).options(selectinload(PurchaseOrder.vendor)).order_by(PurchaseOrder.po_number)
    if vendor_id:
        stmt = stmt.where(PurchaseOrder.vendor_id == vendor_id)
    if status:
        stmt = stmt.where(PurchaseOrder.status == status)

    res = await db.execute(stmt)
    pos = res.scalars().all()

    # Compute remaining balance for each PO
    results = []
    for p in pos:
        _, remaining = await po_matcher.get_remaining_balance(p.id, None, db)
        p_dict = {
            "id": p.id,
            "po_number": p.po_number,
            "vendor_id": p.vendor_id,
            "currency": p.currency,
            "po_total": p.po_total,
            "po_date": p.po_date,
            "status": p.status,
            "description": p.description,
            "line_items": p.line_items,
            "created_at": p.created_at,
            "remaining_balance": remaining,
            "vendor": p.vendor,
        }
        results.append(PurchaseOrderResponse.model_validate(p_dict))

    return results
