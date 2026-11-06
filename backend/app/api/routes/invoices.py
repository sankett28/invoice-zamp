import uuid
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.invoice_run import InvoiceRun
from app.schemas.run import UploadResponse
from app.services.storage_service import get_storage_service
from app.services.pdf_extractor import PDFExtractor
from app.workflow.stages import create_all_stages
from app.workflow.runner import WorkflowRunner

router = APIRouter(prefix="/api/invoices", tags=["invoices"])
pdf_extractor = PDFExtractor()
workflow_runner = WorkflowRunner()


@router.post("", response_model=UploadResponse)
@router.post("/", response_model=UploadResponse)
async def upload_invoice(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Accepts PDF invoice, stores it, initializes run & stage records,
    and enqueues background processing.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")

    run_id = uuid.uuid4()
    sha256 = pdf_extractor.compute_sha256(file_bytes)

    # Store file
    storage = get_storage_service()
    storage_path = await storage.save_file(file_bytes, file.filename, str(run_id))

    # Create run record
    run = InvoiceRun(
        id=run_id,
        original_filename=file.filename,
        file_storage_path=storage_path,
        file_sha256=sha256,
        file_size_bytes=len(file_bytes),
        processing_state="QUEUED",
    )
    db.add(run)
    await db.commit()

    # Pre-populate all 13 stages in PENDING state
    await create_all_stages(run_id, db)

    # Launch workflow runner in background
    background_tasks.add_task(workflow_runner.execute_run, run_id, file_bytes)

    return UploadResponse(
        run_id=run_id,
        processing_state="QUEUED",
        message="Invoice accepted for processing.",
    )
