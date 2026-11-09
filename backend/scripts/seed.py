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
    # --- Standard Test Suite Vendors (Required for regression scenarios) ---
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

    # --- Real-World Enterprise Tech & Cloud Infrastructure ---
    {
        "vendor_code": "V-006",
        "legal_name": "CloudScale Technologies India Pvt Ltd",
        "normalised_name": "cloudscale technologies india",
        "tax_id": "29AABCC1234F1Z8",
        "status": "APPROVED",
    },
    {
        "vendor_code": "V-007",
        "legal_name": "CyberShield Security Systems India LLP",
        "normalised_name": "cybershield security systems india",
        "tax_id": "27AABCS5678K1Z2",
        "status": "APPROVED",
    },

    # --- Hardware, Compute & Peripherals ---
    {
        "vendor_code": "V-008",
        "legal_name": "Apex Hardware & Computing Solutions Pvt Ltd",
        "normalised_name": "apex hardware & computing solutions",
        "tax_id": "07AABCA9012L1Z5",
        "status": "APPROVED",
    },

    # --- Professional Services, Legal & Tax Advisory ---
    {
        "vendor_code": "V-009",
        "legal_name": "Veritas Advisory & Legal Partners LLP",
        "normalised_name": "veritas advisory & legal partners",
        "tax_id": "36AABCV3456M1Z1",
        "status": "APPROVED",
    },

    # --- Supply Chain & Nationwide Freight ---
    {
        "vendor_code": "V-010",
        "legal_name": "Velocity Express Cargo & Supply Chain Pvt Ltd",
        "normalised_name": "velocity express cargo & supply chain",
        "tax_id": "24AABCV7890N1Z3",
        "status": "APPROVED",
    },

    # --- Facilities, Workplace & Sustainability ---
    {
        "vendor_code": "V-011",
        "legal_name": "GreenHorizon Workplace Facilities Pvt Ltd",
        "normalised_name": "greenhorizon workplace facilities",
        "tax_id": "29AABCG2468P1Z6",
        "status": "APPROVED",
    },

    # --- Marketing, Creative Design & Media ---
    {
        "vendor_code": "V-012",
        "legal_name": "PixelCraft Creative & Digital Media Agency",
        "normalised_name": "pixelcraft creative & digital media agency",
        "tax_id": "27AABCP1357Q1Z9",
        "status": "APPROVED",
    },

    # --- Enterprise Telecom & Leased Lines ---
    {
        "vendor_code": "V-013",
        "legal_name": "Redline Telecom & Enterprise Fibre Networks",
        "normalised_name": "redline telecom & enterprise fibre networks",
        "tax_id": "06AABCR9876R1Z4",
        "status": "APPROVED",
    },

    # --- Compliance Negative Test Vendors ---
    {
        "vendor_code": "V-014",
        "legal_name": "QuickFix Electronics & Hardware Repair",
        "normalised_name": "quickfix electronics & hardware repair",
        "tax_id": "27AAACQ1122S1Z1",
        "status": "UNAPPROVED",
    },
    {
        "vendor_code": "V-015",
        "legal_name": "Heritage Print & Document Archival Solutions",
        "normalised_name": "heritage print & document archival solutions",
        "tax_id": None,
        "status": "INACTIVE",
    },
]

PURCHASE_ORDERS = [
    # --- Standard Regression Suite POs ---
    {
        "po_number": "PO-1001",
        "vendor_code": "V-001",
        "po_total": Decimal("100000.00"),
        "po_date": date(2026, 10, 1),
        "status": "OPEN",
        "description": "Office furniture and supplies Q4 2026",
        "line_items": [
            {"description": "Ergonomic Mesh Office Chairs", "quantity": 10, "unit_price": 8000.00, "total": 80000.00},
            {"description": "Adjustable Footrests", "quantity": 10, "unit_price": 2000.00, "total": 20000.00},
        ],
    },
    {
        "po_number": "PO-2001",
        "vendor_code": "V-002",
        "po_total": Decimal("100000.00"),
        "po_date": date(2026, 10, 5),
        "status": "OPEN",
        "description": "IT infrastructure and cloud support services",
        "line_items": [
            {"description": "Cloud Infrastructure Milestone 1 Setup", "quantity": 1, "unit_price": 40000.00, "total": 40000.00},
            {"description": "Cloud Infrastructure Milestone 2 Completion", "quantity": 1, "unit_price": 60000.00, "total": 60000.00},
        ],
    },
    {
        "po_number": "PO-2002",
        "vendor_code": "V-002",
        "po_total": Decimal("80000.00"),
        "po_date": date(2026, 10, 10),
        "status": "OPEN",
        "description": "Software licensing and enterprise support",
        "line_items": [
            {"description": "Software Licensing and Enterprise Maintenance", "quantity": 1, "unit_price": 80000.00, "total": 80000.00},
        ],
    },
    {
        "po_number": "PO-2003",
        "vendor_code": "V-002",
        "po_total": Decimal("75000.00"),
        "po_date": date(2026, 10, 15),
        "status": "OPEN",
        "description": "Network equipment maintenance services",
        "line_items": [
            {"description": "Router and Switch Firmware Updates", "quantity": 1, "unit_price": 75000.00, "total": 75000.00},
        ],
    },
    {
        "po_number": "PO-3001",
        "vendor_code": "V-003",
        "po_total": Decimal("50000.00"),
        "po_date": date(2026, 9, 20),
        "status": "OPEN",
        "description": "Logistics, freight and inter-city transport",
        "line_items": [
            {"description": "Freight Shipping Inter-State Consignment", "quantity": 1, "unit_price": 50000.00, "total": 50000.00},
        ],
    },
    {
        "po_number": "PO-4001",
        "vendor_code": "V-001",
        "po_total": Decimal("30000.00"),
        "po_date": date(2026, 8, 1),
        "status": "CLOSED",
        "description": "Completed office stationery order",
        "line_items": [
            {"description": "Premium Copier Paper A4", "quantity": 50, "unit_price": 600.00, "total": 30000.00},
        ],
    },
    {
        "po_number": "PO-5001",
        "vendor_code": "V-001",
        "po_total": Decimal("60000.00"),
        "po_date": date(2026, 8, 15),
        "status": "CANCELLED",
        "description": "Cancelled furniture contract",
        "line_items": [],
    },
    {
        "po_number": "PO-6001",
        "vendor_code": "V-003",
        "po_total": Decimal("45000.00"),
        "po_date": date(2026, 10, 2),
        "status": "OPEN",
        "description": "BluePeak specialised freight services",
        "line_items": [
            {"description": "Specialised Transport Handling", "quantity": 1, "unit_price": 45000.00, "total": 45000.00},
        ],
    },

    # --- Real-World Enterprise POs ---
    # CloudScale (V-006)
    {
        "po_number": "PO-7001",
        "vendor_code": "V-006",
        "po_total": Decimal("850000.00"),
        "po_date": date(2026, 10, 1),
        "status": "OPEN",
        "description": "Multi-Region AWS Cloud Hosting, Kubernetes & Managed Database Infrastructure",
        "line_items": [
            {"description": "Amazon EC2 Reserved Compute (m6i.4xlarge cluster)", "quantity": 1, "unit_price": 420000.00, "total": 420000.00},
            {"description": "Amazon Aurora PostgreSQL Multi-AZ Cluster", "quantity": 1, "unit_price": 210000.00, "total": 210000.00},
            {"description": "CloudFront Global CDN Data Transfer (15TB)", "quantity": 1, "unit_price": 125000.00, "total": 125000.00},
            {"description": "Amazon S3 Glacier & Hot Storage Tier", "quantity": 1, "unit_price": 95000.00, "total": 95000.00},
        ],
    },
    {
        "po_number": "PO-7002",
        "vendor_code": "V-006",
        "po_total": Decimal("320000.00"),
        "po_date": date(2026, 10, 15),
        "status": "OPEN",
        "description": "Datadog Enterprise APM, Observability & Cloud SIEM Licensing FY26",
        "line_items": [
            {"description": "Datadog APM Host Pro License (50 Hosts)", "quantity": 50, "unit_price": 3600.00, "total": 180000.00},
            {"description": "Cloud SIEM Security Monitoring (1M Events/day)", "quantity": 1, "unit_price": 80000.00, "total": 80000.00},
            {"description": "Synthetics & Real User Monitoring (RUM)", "quantity": 1, "unit_price": 60000.00, "total": 60000.00},
        ],
    },

    # CyberShield Security (V-007)
    {
        "po_number": "PO-7003",
        "vendor_code": "V-007",
        "po_total": Decimal("560000.00"),
        "po_date": date(2026, 9, 25),
        "status": "OPEN",
        "description": "CrowdStrike Falcon Endpoint Security & 24/7 Managed SOC Services",
        "line_items": [
            {"description": "CrowdStrike Falcon Insight XDR (120 Seats)", "quantity": 120, "unit_price": 3000.00, "total": 360000.00},
            {"description": "Falcon Complete 24/7 Managed Threat Hunting", "quantity": 1, "unit_price": 200000.00, "total": 200000.00},
        ],
    },
    {
        "po_number": "PO-7004",
        "vendor_code": "V-007",
        "po_total": Decimal("240000.00"),
        "po_date": date(2026, 10, 12),
        "status": "OPEN",
        "description": "Annual VAPT Security Audit, Cloud Penetration Testing & ISO Compliance",
        "line_items": [
            {"description": "Web & Mobile Application Penetration Testing", "quantity": 1, "unit_price": 140000.00, "total": 140000.00},
            {"description": "AWS Cloud Security Architecture Audit", "quantity": 1, "unit_price": 100000.00, "total": 100000.00},
        ],
    },

    # Apex Hardware (V-008)
    {
        "po_number": "PO-8001",
        "vendor_code": "V-008",
        "po_total": Decimal("1450000.00"),
        "po_date": date(2026, 10, 1),
        "status": "OPEN",
        "description": "Engineering High-Performance Developer Workstations & 4K Displays",
        "line_items": [
            {"description": "Apple MacBook Pro 16\" (M3 Max, 64GB RAM, 1TB SSD)", "quantity": 5, "unit_price": 200000.00, "total": 1000000.00},
            {"description": "Dell UltraSharp 32\" 4K USB-C Hub Monitors", "quantity": 10, "unit_price": 35000.00, "total": 350000.00},
            {"description": "CalDigit TS4 Thunderbolt 4 Docks", "quantity": 10, "unit_price": 10000.00, "total": 100000.00},
        ],
    },
    {
        "po_number": "PO-8002",
        "vendor_code": "V-008",
        "po_total": Decimal("475000.00"),
        "po_date": date(2026, 10, 8),
        "status": "OPEN",
        "description": "Executive Boardroom Video Conferencing Hardware Suite",
        "line_items": [
            {"description": "Neat Bar Pro All-in-One Video Collaboration Bar", "quantity": 1, "unit_price": 285000.00, "total": 285000.00},
            {"description": "LG Commercial Display 75\" 4K UHD", "quantity": 1, "unit_price": 140000.00, "total": 140000.00},
            {"description": "Neat Pad 8-inch Dedicated Room Controller", "quantity": 1, "unit_price": 50000.00, "total": 50000.00},
        ],
    },
    {
        "po_number": "PO-8003",
        "vendor_code": "V-008",
        "po_total": Decimal("380000.00"),
        "po_date": date(2026, 7, 10),
        "status": "CLOSED",
        "description": "Server Room Modular UPS Battery Bank Upgrade",
        "line_items": [
            {"description": "APC Symmetra LX Modular Battery Cartridge", "quantity": 4, "unit_price": 95000.00, "total": 380000.00},
        ],
    },

    # Veritas Advisory (V-009)
    {
        "po_number": "PO-9001",
        "vendor_code": "V-009",
        "po_total": Decimal("600000.00"),
        "po_date": date(2026, 9, 15),
        "status": "OPEN",
        "description": "Corporate Commercial Legal Retainer, Data Privacy & IP Filing Advisory",
        "line_items": [
            {"description": "Monthly Corporate Legal Advisory Retainer (H2 FY26)", "quantity": 1, "unit_price": 350000.00, "total": 350000.00},
            {"description": "Global Data Privacy & Regulatory Compliance Assessment", "quantity": 1, "unit_price": 150000.00, "total": 150000.00},
            {"description": "Trademark Portfolio Prosecution & Filings", "quantity": 1, "unit_price": 100000.00, "total": 100000.00},
        ],
    },
    {
        "po_number": "PO-9002",
        "vendor_code": "V-009",
        "po_total": Decimal("450000.00"),
        "po_date": date(2026, 10, 5),
        "status": "OPEN",
        "description": "Cross-Border Transfer Pricing & Statutory Financial Audit Consulting",
        "line_items": [
            {"description": "Transfer Pricing Benchmarking Study FY26", "quantity": 1, "unit_price": 250000.00, "total": 250000.00},
            {"description": "International Intercompany Agreement Review", "quantity": 1, "unit_price": 200000.00, "total": 200000.00},
        ],
    },

    # Velocity Express Cargo (V-010)
    {
        "po_number": "PO-10001",
        "vendor_code": "V-010",
        "po_total": Decimal("380000.00"),
        "po_date": date(2026, 10, 1),
        "status": "OPEN",
        "description": "Nationwide Temperature-Controlled Cold Chain Freight Logistics",
        "line_items": [
            {"description": "Refrigerated Container Linehaul Express (10 Trips)", "quantity": 10, "unit_price": 24000.00, "total": 240000.00},
            {"description": "Multi-hub Logistics Handling & Transit Insurance", "quantity": 1, "unit_price": 140000.00, "total": 140000.00},
        ],
    },
    {
        "po_number": "PO-10002",
        "vendor_code": "V-010",
        "po_total": Decimal("195000.00"),
        "po_date": date(2026, 10, 18),
        "status": "OPEN",
        "description": "Inter-facility Central Warehouse Pallet Relocation Haulage",
        "line_items": [
            {"description": "32-ft Multi-Axle Container Road Freight (5 Trips)", "quantity": 5, "unit_price": 39000.00, "total": 195000.00},
        ],
    },

    # GreenHorizon Facilities (V-011)
    {
        "po_number": "PO-11001",
        "vendor_code": "V-011",
        "po_total": Decimal("275000.00"),
        "po_date": date(2026, 9, 1),
        "status": "OPEN",
        "description": "Headquarters Comprehensive Facility Management & Sanitisation",
        "line_items": [
            {"description": "Facility Housekeeping & Deep Clean Services Q3", "quantity": 1, "unit_price": 185000.00, "total": 185000.00},
            {"description": "Commercial HVAC Air Filtration & Sanitisation", "quantity": 1, "unit_price": 90000.00, "total": 90000.00},
        ],
    },
    {
        "po_number": "PO-11002",
        "vendor_code": "V-011",
        "po_total": Decimal("120000.00"),
        "po_date": date(2026, 10, 15),
        "status": "OPEN",
        "description": "Cafeteria Specialty Coffee Roaster Supplies & Organic Pantry",
        "line_items": [
            {"description": "Specialty Arabica Roasted Whole Coffee Beans (40kg)", "quantity": 40, "unit_price": 1200.00, "total": 48000.00},
            {"description": "Barista Grade Oat Milk (100 Litres)", "quantity": 100, "unit_price": 320.00, "total": 32000.00},
            {"description": "Organic Herbal Tea Assortment Boxes", "quantity": 40, "unit_price": 500.00, "total": 20000.00},
            {"description": "Biodegradable Compostable Pantry Disposables", "quantity": 1, "unit_price": 20000.00, "total": 20000.00},
        ],
    },

    # PixelCraft Creative (V-012)
    {
        "po_number": "PO-12001",
        "vendor_code": "V-012",
        "po_total": Decimal("920000.00"),
        "po_date": date(2026, 9, 20),
        "status": "OPEN",
        "description": "Enterprise Web & Mobile Design System Architecture, Figma UI/UX",
        "line_items": [
            {"description": "Cross-Platform Design System Tokens & Components", "quantity": 1, "unit_price": 460000.00, "total": 460000.00},
            {"description": "Native iOS and Android Core UX Flow Prototypes", "quantity": 1, "unit_price": 340000.00, "total": 340000.00},
            {"description": "Interactive Storybook Component Review & Design QA", "quantity": 1, "unit_price": 120000.00, "total": 120000.00},
        ],
    },
    {
        "po_number": "PO-12002",
        "vendor_code": "V-012",
        "po_total": Decimal("480000.00"),
        "po_date": date(2026, 10, 10),
        "status": "OPEN",
        "description": "Product Launch 3D Motion Reel & WebGL Interactive Media",
        "line_items": [
            {"description": "60-second 3D Cinema4D Product Launch Video Reel", "quantity": 1, "unit_price": 320000.00, "total": 320000.00},
            {"description": "Interactive WebGL 3D Model Assets for Marketing Web", "quantity": 1, "unit_price": 160000.00, "total": 160000.00},
        ],
    },

    # Redline Telecom (V-013)
    {
        "po_number": "PO-13001",
        "vendor_code": "V-013",
        "po_total": Decimal("360000.00"),
        "po_date": date(2026, 9, 1),
        "status": "OPEN",
        "description": "1 Gbps Dedicated 1:1 Internet Leased Line (ILL) Annual Service",
        "line_items": [
            {"description": "1 Gbps Symmetric Dedicated Internet Leased Line", "quantity": 1, "unit_price": 360000.00, "total": 360000.00},
        ],
    },

    # QuickFix Electronics (V-014 - UNAPPROVED)
    {
        "po_number": "PO-14001",
        "vendor_code": "V-014",
        "po_total": Decimal("85000.00"),
        "po_date": date(2026, 10, 20),
        "status": "OPEN",
        "description": "Emergency Server Room HVAC Chiller Overhaul & Compressor Servicing",
        "line_items": [
            {"description": "Industrial Chiller Compressor Overhaul & Refrigerant Gas", "quantity": 1, "unit_price": 85000.00, "total": 85000.00},
        ],
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
                    line_items=po_data.get("line_items", []),
                )
                session.add(po)
                print(f"Created PO: {po_num} for {v_code} (Total: INR {po_data['po_total']})")

        await session.commit()
        print(f"Database seeding completed successfully. ({len(VENDORS)} Vendors, {len(PURCHASE_ORDERS)} POs)")


if __name__ == "__main__":
    reset_db = "--reset" in sys.argv
    asyncio.run(seed(reset=reset_db))
