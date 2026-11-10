import uuid
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.purchase_order import PurchaseOrder
from app.models.invoice_run import InvoiceRun
from app.schemas.purchase_order import PurchaseOrderResponse
from app.services.cache_service import cache

router = APIRouter(prefix="/api/purchase-orders", tags=["purchase-orders"])


@router.get("", response_model=list[PurchaseOrderResponse])
@router.get("/", response_model=list[PurchaseOrderResponse])
async def list_purchase_orders(
    vendor_id: uuid.UUID | None = Query(None),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"pos:{vendor_id or 'all'}:{status or 'all'}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    stmt = select(PurchaseOrder).options(selectinload(PurchaseOrder.vendor)).order_by(PurchaseOrder.po_number)
    if vendor_id:
        stmt = stmt.where(PurchaseOrder.vendor_id == vendor_id)
    if status:
        stmt = stmt.where(PurchaseOrder.status == status)

    res = await db.execute(stmt)
    pos = res.scalars().all()

    # BATCH: Single query for all committed balances across all POs
    sum_stmt = (
        select(
            InvoiceRun.purchase_order_id,
            func.coalesce(func.sum(InvoiceRun.grand_total), 0),
        )
        .where(
            InvoiceRun.purchase_order_id.isnot(None),
            InvoiceRun.decision_status == "READY_FOR_AP_APPROVAL",
        )
        .group_by(InvoiceRun.purchase_order_id)
    )
    sum_res = await db.execute(sum_stmt)
    committed_map = {row[0]: Decimal(str(row[1])) for row in sum_res.all()}

    # Compute remaining balance in memory (0ms)
    results = []
    for p in pos:
        committed = committed_map.get(p.id, Decimal("0.00"))
        remaining = max(Decimal("0.00"), p.po_total - committed)
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

    # Cache for 60 seconds
    cache.set(cache_key, results, ttl_seconds=60)
    return results
