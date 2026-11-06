import io
import uuid
import zipfile
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.invoice_run import InvoiceRun
from app.schemas.run import UploadResponse, BatchUploadResponse
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
        original_filename=file.filename,
        processing_state="QUEUED",
        message="Invoice accepted for processing.",
    )


@router.post("/batch", response_model=BatchUploadResponse)
async def upload_batch(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Batch invoice ingestion endpoint.
    Accepts multiple PDF files or a .zip archive containing PDFs.
    """
    successful_runs: list[UploadResponse] = []
    errors: list[dict[str, str]] = []
    storage = get_storage_service()

    file_items_to_process: list[tuple[str, bytes]] = []

    for f in files:
        fname = f.filename or "unknown.pdf"
        b = await f.read()
        if not b:
            errors.append({"filename": fname, "error": "Empty file (0 bytes)"})
            continue

        if fname.lower().endswith(".zip"):
            # Unpack zip
            try:
                with zipfile.ZipFile(io.BytesIO(b)) as z:
                    for zip_info in z.infolist():
                        if not zip_info.is_dir() and zip_info.filename.lower().endswith(".pdf") and not zip_info.filename.startswith("__MACOSX"):
                            pdf_bytes = z.read(zip_info.filename)
                            base_pdf_name = zip_info.filename.split("/")[-1].split("\\")[-1]
                            file_items_to_process.append((base_pdf_name, pdf_bytes))
            except Exception as e:
                errors.append({"filename": fname, "error": f"Invalid zip archive: {str(e)}"})
        elif fname.lower().endswith(".pdf"):
            file_items_to_process.append((fname, b))
        else:
            errors.append({"filename": fname, "error": "Unsupported file format. Only PDF and ZIP are supported."})

    for item_name, item_bytes in file_items_to_process:
        try:
            run_id = uuid.uuid4()
            sha256 = pdf_extractor.compute_sha256(item_bytes)
            storage_path = await storage.save_file(item_bytes, item_name, str(run_id))

            run = InvoiceRun(
                id=run_id,
                original_filename=item_name,
                file_storage_path=storage_path,
                file_sha256=sha256,
                file_size_bytes=len(item_bytes),
                processing_state="QUEUED",
            )
            db.add(run)
            await db.commit()

            await create_all_stages(run_id, db)
            background_tasks.add_task(workflow_runner.execute_run, run_id, item_bytes)

            successful_runs.append(
                UploadResponse(
                    run_id=run_id,
                    original_filename=item_name,
                    processing_state="QUEUED",
                    message="Enqueued for processing",
                )
            )
        except Exception as e:
            errors.append({"filename": item_name, "error": str(e)})

    return BatchUploadResponse(
        total_files=len(file_items_to_process),
        successful_queued=len(successful_runs),
        runs=successful_runs,
        errors=errors,
    )
