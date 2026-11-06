import uuid
from datetime import datetime
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.run_stage import RunStage


STAGE_DEFINITIONS = [
    {"sequence": 1, "stage_key": "file_received", "display_name": "File Received"},
    {"sequence": 2, "stage_key": "file_validation", "display_name": "PDF Validated"},
    {"sequence": 3, "stage_key": "duplicate_check_exact", "display_name": "Exact Duplicate Check"},
    {"sequence": 4, "stage_key": "text_extraction", "display_name": "Text Extraction"},
    {"sequence": 5, "stage_key": "ocr_fallback", "display_name": "OCR / Vision Fallback"},
    {"sequence": 6, "stage_key": "llm_extraction", "display_name": "AI Field Extraction"},
    {"sequence": 7, "stage_key": "extraction_validation", "display_name": "Extraction Validation"},
    {"sequence": 8, "stage_key": "vendor_validation", "display_name": "Vendor Validation"},
    {"sequence": 9, "stage_key": "po_matching", "display_name": "PO Matching"},
    {"sequence": 10, "stage_key": "duplicate_check_business", "display_name": "Business Duplicate Check"},
    {"sequence": 11, "stage_key": "financial_reconciliation", "display_name": "Financial Reconciliation"},
    {"sequence": 12, "stage_key": "po_balance_check", "display_name": "PO Balance Check"},
    {"sequence": 13, "stage_key": "decision_engine", "display_name": "Decision Generated"},
]


async def create_all_stages(run_id: uuid.UUID, db: AsyncSession) -> None:
    """Pre-populates all 13 stages in PENDING state."""
    for item in STAGE_DEFINITIONS:
        stage = RunStage(
            run_id=run_id,
            stage_key=item["stage_key"],
            display_name=item["display_name"],
            sequence=item["sequence"],
            status="PENDING",
        )
        db.add(stage)
    await db.commit()


async def mark_stage_running(run_id: uuid.UUID, stage_key: str, db: AsyncSession) -> None:
    """Marks a stage as RUNNING with started_at timestamp."""
    stmt = (
        update(RunStage)
        .where(RunStage.run_id == run_id, RunStage.stage_key == stage_key)
        .values(status="RUNNING", started_at=datetime.utcnow())
    )
    await db.execute(stmt)
    await db.commit()


def _clean_for_json(obj: any) -> any:
    """Recursively converts Decimals, UUIDs, dates, and models into JSON-serializable primitives."""
    if obj is None:
        return None
    from decimal import Decimal
    from datetime import date, datetime
    if isinstance(obj, Decimal):
        return str(obj)
    if isinstance(obj, (uuid.UUID, date, datetime)):
        return str(obj)
    if isinstance(obj, dict):
        return {str(k): _clean_for_json(v) for k, v in obj.items() if not str(k).startswith("_")}
    if isinstance(obj, (list, tuple, set)):
        return [_clean_for_json(x) for x in obj]
    if hasattr(obj, "__dict__"):
        return {k: _clean_for_json(v) for k, v in obj.__dict__.items() if not k.startswith("_")}
    return obj


async def mark_stage_done(
    run_id: uuid.UUID,
    stage_key: str,
    status: str,  # COMPLETED / FAILED / SKIPPED / NEEDS_ATTENTION
    summary: str | None = None,
    details: dict | None = None,
    db: AsyncSession | None = None,
) -> None:
    """Updates a stage to completed/failed/skipped with timing and summary."""
    now = datetime.utcnow()
    stmt = select(RunStage).where(RunStage.run_id == run_id, RunStage.stage_key == stage_key)
    res = await db.execute(stmt)
    stage = res.scalars().first()
    if stage:
        stage.status = status
        stage.completed_at = now
        stage.summary = summary
        stage.details = _clean_for_json(details) if details is not None else None
        if stage.started_at:
            delta = now - stage.started_at
            stage.duration_ms = int(delta.total_seconds() * 1000)
        else:
            stage.duration_ms = 50
        await db.commit()
