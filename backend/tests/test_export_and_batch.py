import io
import pytest
import zipfile
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.database import engine, Base


@pytest.fixture(autouse=True)
async def setup_test_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.mark.asyncio
async def test_erp_export_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Test CSV export
        csv_res = await client.get("/api/runs/export?format=csv")
        assert csv_res.status_code == 200
        assert "text/csv" in csv_res.headers["content-type"]
        assert "run_id,invoice_number" in csv_res.text

        # Test JSON export
        json_res = await client.get("/api/runs/export?format=json")
        assert json_res.status_code == 200
        assert "application/json" in json_res.headers["content-type"]
        data = json_res.json()
        assert "invoices" in data
        assert "count" in data


@pytest.mark.asyncio
async def test_batch_upload_zip():
    # Construct an in-memory ZIP with a sample PDF
    pdf_bytes = b"%PDF-1.4 sample invoice content"
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as z:
        z.writestr("test_invoice_1.pdf", pdf_bytes)
        z.writestr("test_invoice_2.pdf", pdf_bytes)
    zip_buffer.seek(0)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        files = [("files", ("invoices.zip", zip_buffer.getvalue(), "application/zip"))]
        res = await client.post("/api/invoices/batch", files=files)
        assert res.status_code == 200
        data = res.json()
        assert data["total_files"] == 2
        assert data["successful_queued"] == 2
        assert len(data["runs"]) == 2
