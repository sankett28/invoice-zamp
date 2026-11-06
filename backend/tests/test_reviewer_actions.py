import uuid
from decimal import Decimal
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.models.invoice_run import InvoiceRun
from app.models.purchase_order import PurchaseOrder
from app.database import async_session_factory
from sqlalchemy import select


@pytest.mark.asyncio
async def test_reviewer_confirm_action():
    run_id = uuid.uuid4()
    async with async_session_factory() as db:
        run = InvoiceRun(
            id=run_id,
            original_filename="review_test.pdf",
            file_storage_path="/storage/test.pdf",
            file_sha256="rev_hash_" + uuid.uuid4().hex,
            file_size_bytes=2048,
            processing_state="COMPLETED",
            decision_status="REVIEW_REQUIRED",
        )
        db.add(run)
        await db.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "action": "CONFIRM",
            "reviewer_label": "Sanket Auditor",
            "reason": "Verified line items with department manager via phone call.",
        }
        res = await client.post(f"/api/runs/{run_id}/review", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["action"] == "CONFIRM"
        assert data["reviewer_label"] == "Sanket Auditor"
        assert data["reason"] == payload["reason"]

        # Verify review event was saved to run detail and run transitions to READY_FOR_AP_APPROVAL
        detail_res = await client.get(f"/api/runs/{run_id}")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert len(detail["review_events"]) >= 1
        assert detail["review_events"][-1]["action"] == "CONFIRM"
        assert detail["decision_status"] == "READY_FOR_AP_APPROVAL"


@pytest.mark.asyncio
async def test_reviewer_assign_po_action():
    run_id = uuid.uuid4()
    async with async_session_factory() as db:
        res = await db.execute(select(PurchaseOrder).where(PurchaseOrder.po_number == "PO-2002"))
        po = res.scalars().first()
        assert po is not None

        run = InvoiceRun(
            id=run_id,
            original_filename="missing_po_test.pdf",
            file_storage_path="/storage/missing_po.pdf",
            file_sha256="po_hash_" + uuid.uuid4().hex,
            file_size_bytes=2048,
            processing_state="COMPLETED",
            decision_status="REVIEW_REQUIRED",
            purchase_order_id=None,
        )
        db.add(run)
        await db.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "action": "ASSIGN_PO",
            "reviewer_label": "AP Lead",
            "reason": "Assigned PO-2002 as confirmed with IT procurement.",
            "po_id": str(po.id),
        }
        res = await client.post(f"/api/runs/{run_id}/review", json=payload)
        assert res.status_code == 200

        # Verify run now has the assigned purchase_order_id
        detail_res = await client.get(f"/api/runs/{run_id}")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["purchase_order"] is not None
        assert detail["purchase_order"]["id"] == str(po.id)
        assert detail["purchase_order"]["po_number"] == "PO-2002"
        assert detail["decision_status"] == "READY_FOR_AP_APPROVAL"


@pytest.mark.asyncio
async def test_reviewer_validation_empty_reason():
    run_id = uuid.uuid4()
    async with async_session_factory() as db:
        run = InvoiceRun(
            id=run_id,
            original_filename="empty_reason_test.pdf",
            file_storage_path="/storage/test.pdf",
            file_sha256="empty_reason_" + uuid.uuid4().hex,
            file_size_bytes=1024,
            processing_state="COMPLETED",
            decision_status="REVIEW_REQUIRED",
        )
        db.add(run)
        await db.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "action": "CONFIRM",
            "reviewer_label": "Sanket",
            "reason": "   ",  # Blank/whitespace reason must be rejected
        }
        res = await client.post(f"/api/runs/{run_id}/review", json=payload)
        assert res.status_code in (400, 422)
        assert "mandatory" in res.json()["detail"].lower()
