import os
import uuid
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import Response
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.invoice_run import InvoiceRun
from app.models.review_event import ReviewEvent
from app.models.purchase_order import PurchaseOrder
from app.schemas.run import (
    RunSummary,
    RunDetailResponse,
    ReviewEventResponse,
    ReviewRequest,
)
from app.services.storage_service import get_storage_service
from app.services.po_matcher import POMatcher
from app.workflow.runner import WorkflowRunner

router = APIRouter(prefix="/api/runs", tags=["runs"])
storage_service = get_storage_service()
po_matcher = POMatcher()
workflow_runner = WorkflowRunner()


@router.get("", response_model=list[RunSummary])
@router.get("/", response_model=list[RunSummary])
async def list_runs(
    status: str | None = Query(None, description="Filter by decision_status or processing_state"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(InvoiceRun)
        .options(selectinload(InvoiceRun.vendor), selectinload(InvoiceRun.purchase_order))
        .order_by(desc(InvoiceRun.created_at))
        .offset(offset)
        .limit(limit)
    )
    if status:
        if status in ("QUEUED", "PROCESSING", "COMPLETED", "FAILED"):
            stmt = stmt.where(InvoiceRun.processing_state == status)
        else:
            stmt = stmt.where(InvoiceRun.decision_status == status)

    result = await db.execute(stmt)
    runs = result.scalars().all()
    return runs


@router.get("/{run_id}", response_model=RunDetailResponse)
async def get_run_detail(run_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(InvoiceRun)
        .options(
            selectinload(InvoiceRun.vendor),
            selectinload(InvoiceRun.purchase_order),
            selectinload(InvoiceRun.stages),
            selectinload(InvoiceRun.rule_results),
            selectinload(InvoiceRun.decision),
            selectinload(InvoiceRun.review_events),
        )
        .where(InvoiceRun.id == run_id)
    )
    res = await db.execute(stmt)
    run = res.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")

    # Calculate live remaining balance on PO if attached
    po_resp = None
    if run.purchase_order:
        _, rem = await po_matcher.get_remaining_balance(run.purchase_order.id, run.id, db)
        po_dict = {
            "id": run.purchase_order.id,
            "po_number": run.purchase_order.po_number,
            "vendor_id": run.purchase_order.vendor_id,
            "currency": run.purchase_order.currency,
            "po_total": run.purchase_order.po_total,
            "po_date": run.purchase_order.po_date,
            "status": run.purchase_order.status,
            "description": run.purchase_order.description,
            "created_at": run.purchase_order.created_at,
            "remaining_balance": rem,
        }
        po_resp = po_dict

    resp_dict = RunDetailResponse.model_validate(run).model_dump()
    if po_resp:
        resp_dict["purchase_order"] = po_resp

    return resp_dict


@router.get("/{run_id}/file")
async def get_run_file(run_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(InvoiceRun).where(InvoiceRun.id == run_id)
    res = await db.execute(stmt)
    run = res.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")

    try:
        content = await storage_service.get_file(run.file_storage_path)
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{run.original_filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File could not be retrieved: {str(e)}")


@router.post("/{run_id}/review", response_model=ReviewEventResponse)
async def submit_review(
    run_id: uuid.UUID,
    review_req: ReviewRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Submits a human review decision (Decision D-006).
    Appends review event without destroying original automated decision.
    """
    stmt = select(InvoiceRun).where(InvoiceRun.id == run_id)
    res = await db.execute(stmt)
    run = res.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")

    if not review_req.reason.strip():
        raise HTTPException(status_code=400, detail="Reviewer reason note is mandatory.")

    # Record review event
    metadata = {}
    if review_req.assigned_po_id:
        po_stmt = select(PurchaseOrder).where(PurchaseOrder.id == review_req.assigned_po_id)
        po_res = await db.execute(po_stmt)
        po = po_res.scalar_one_or_none()
        if po:
            run.purchase_order_id = po.id
            run.purchase_order = po
            metadata["assigned_po_number"] = po.po_number

    event = ReviewEvent(
        run_id=run_id,
        action=review_req.action.upper(),
        reviewer_label=review_req.reviewer_label,
        reason=review_req.reason.strip(),
        metadata_=metadata if metadata else None,
    )
    db.add(event)

    # If action is CONFIRM or ASSIGN_PO, mark decision_status as READY_FOR_AP_APPROVAL to commit
    if review_req.action.upper() in ["CONFIRM", "ASSIGN_PO"]:
        run.decision_status = "READY_FOR_AP_APPROVAL"
        run.decision_summary = f"Reviewer resolved invoice ({review_req.action.upper()}): {review_req.reason.strip()}"
    elif review_req.action.upper() == "REJECT":
        run.decision_status = "BLOCKED"
        run.decision_summary = f"Reviewer rejected invoice: {review_req.reason.strip()}"

    await db.commit()
    await db.refresh(event)

    return ReviewEventResponse.model_validate(event)


@router.post("/{run_id}/retry")
async def retry_run(
    run_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(InvoiceRun).where(InvoiceRun.id == run_id)
    res = await db.execute(stmt)
    run = res.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")

    file_bytes = await storage_service.get_file(run.file_storage_path)
    background_tasks.add_task(workflow_runner.execute_run, run_id, file_bytes)

    return {"message": "Run retry enqueued.", "run_id": run_id}
