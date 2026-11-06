import asyncio
import os
import sys
import uuid
from datetime import date
from decimal import Decimal

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, delete
from app.database import async_session_factory, engine, Base
from app.models.vendor import Vendor
from app.models.purchase_order import PurchaseOrder
from app.models.invoice_run import InvoiceRun
from app.models.run_stage import RunStage
from app.models.rule_result import RuleResult
from app.models.invoice_decision import InvoiceDecision
from app.models.review_event import ReviewEvent

VENDORS = [
    {
        "vendor_code": "V-001",
        "legal_name": "Aster Office Supplies Pvt Ltd",
        "normalised_name": "aster office supplies",
        "tax_id": "27ABCDE1234F1Z5",
        "status": "APPROVED",
    },
    {
        "vendor_code": "V-002",
        "legal_name": "Northstar IT Services Pvt Ltd",
        "normalised_name": "northstar it services",
        "tax_id": "29FGHIJ5678K2Y3",
        "status": "APPROVED",
    },
    {
        "vendor_code": "V-003",
        "legal_name": "BluePeak Logistics Pvt Ltd",
        "normalised_name": "bluepeak logistics",
        "tax_id": "33KLMNO9012L3X4",
        "status": "APPROVED",
    },
    {
        "vendor_code": "V-004",
        "legal_name": "OldTown Stationery",
        "normalised_name": "oldtown stationery",
        "tax_id": None,
        "status": "INACTIVE",
    },
    {
        "vendor_code": "V-005",
        "legal_name": "Metro Components",
        "normalised_name": "metro components",
        "tax_id": "36PQRST3456M4W5",
        "status": "UNAPPROVED",
    },
]

PURCHASE_ORDERS = [
    {
        "po_number": "PO-1001",
        "vendor_code": "V-001",
        "po_total": Decimal("100000.00"),
        "po_date": date(2026, 10, 1),
        "status": "OPEN",
        "description": "Office furniture and supplies Q4 2026",
    },
    {
        "po_number": "PO-2001",
        "vendor_code": "V-002",
        "po_total": Decimal("100000.00"),
        "po_date": date(2026, 10, 5),
        "status": "OPEN",
        "description": "IT infrastructure and cloud support services",
    },
    {
        "po_number": "PO-2002",
        "vendor_code": "V-002",
        "po_total": Decimal("80000.00"),
        "po_date": date(2026, 10, 10),
        "status": "OPEN",
        "description": "Software licensing and enterprise support",
    },
    {
        "po_number": "PO-2003",
        "vendor_code": "V-002",
        "po_total": Decimal("75000.00"),
        "po_date": date(2026, 10, 15),
        "status": "OPEN",
        "description": "Network equipment maintenance services",
    },
    {
        "po_number": "PO-3001",
        "vendor_code": "V-003",
        "po_total": Decimal("50000.00"),
        "po_date": date(2026, 9, 20),
        "status": "OPEN",
        "description": "Logistics, freight and inter-city transport",
    },
    {
        "po_number": "PO-4001",
        "vendor_code": "V-001",
        "po_total": Decimal("30000.00"),
        "po_date": date(2026, 8, 1),
        "status": "CLOSED",
        "description": "Completed office stationery order",
    },
    {
        "po_number": "PO-5001",
        "vendor_code": "V-001",
        "po_total": Decimal("60000.00"),
        "po_date": date(2026, 8, 15),
        "status": "CANCELLED",
        "description": "Cancelled furniture contract",
    },
    {
        "po_number": "PO-6001",
        "vendor_code": "V-003",
        "po_total": Decimal("45000.00"),
        "po_date": date(2026, 10, 2),
        "status": "OPEN",
        "description": "BluePeak specialised freight services",
    },
]


async def seed(reset: bool = False):
    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        if reset:
            print("Reset flag detected. Clearing invoice runs, decisions, rules, and events...")
            await session.execute(delete(ReviewEvent))
            await session.execute(delete(InvoiceDecision))
            await session.execute(delete(RuleResult))
            await session.execute(delete(RunStage))
            await session.execute(delete(InvoiceRun))
            await session.execute(delete(PurchaseOrder))
            await session.execute(delete(Vendor))
            await session.commit()
            print("Existing records cleared.")

        # Seed Vendors
        vendor_map = {}
        for v_data in VENDORS:
            stmt = select(Vendor).where(Vendor.vendor_code == v_data["vendor_code"])
            res = await session.execute(stmt)
            existing = res.scalars().first()
            if not existing:
                vendor = Vendor(**v_data)
                session.add(vendor)
                await session.flush()
                vendor_map[v_data["vendor_code"]] = vendor.id
                print(f"Created vendor: {v_data['vendor_code']} - {v_data['legal_name']}")
            else:
                vendor_map[v_data["vendor_code"]] = existing.id

        # Seed Purchase Orders
        for po_data in PURCHASE_ORDERS:
            po_num = po_data["po_number"]
            v_code = po_data["vendor_code"]
            v_id = vendor_map.get(v_code)
            if not v_id:
                continue

            stmt = select(PurchaseOrder).where(PurchaseOrder.po_number == po_num)
            res = await session.execute(stmt)
            existing = res.scalars().first()
            if not existing:
                po = PurchaseOrder(
                    po_number=po_num,
                    vendor_id=v_id,
                    po_total=po_data["po_total"],
                    po_date=po_data["po_date"],
                    status=po_data["status"],
                    description=po_data["description"],
                )
                session.add(po)
                print(f"Created PO: {po_num} for {v_code} (Total: INR {po_data['po_total']})")

        await session.commit()
        print("Database seeding completed successfully.")


if __name__ == "__main__":
    reset_db = "--reset" in sys.argv
    asyncio.run(seed(reset=reset_db))
