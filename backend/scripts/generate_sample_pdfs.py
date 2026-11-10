import os
import sys
import fitz  # PyMuPDF

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../sample_data/invoices"))
os.makedirs(OUT_DIR, exist_ok=True)


def create_invoice_pdf(
    filename: str,
    vendor_name: str,
    vendor_tax_id: str | None,
    vendor_address: str,
    invoice_number: str | None,
    invoice_date: str | None,
    po_number: str | None,
    items: list[tuple[str, str, str, str]],  # desc, qty, unit_price, line_total
    subtotal: str | None,
    tax_total: str | None,
    grand_total: str | None,
    notes: str = "",
    tax_label: str = "Tax Total (18% GST):",
    make_image_scan: bool = False,
):
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4 size

    # Colors
    primary_color = (0.08, 0.18, 0.38)
    text_color = (0.15, 0.15, 0.15)
    line_color = (0.82, 0.82, 0.85)

    # Header Banner
    page.draw_rect(fitz.Rect(40, 40, 555, 95), color=None, fill=(0.95, 0.96, 0.98))
    page.insert_text(fitz.Point(55, 74), vendor_name, fontsize=16, fontname="helv", color=primary_color)
    page.insert_text(fitz.Point(440, 74), "TAX INVOICE", fontsize=14, fontname="helv", color=primary_color)

    y = 115
    # Vendor & Bill To Details
    page.insert_text(fitz.Point(55, y), f"Vendor: {vendor_name}", fontsize=10, fontname="helv", color=text_color)
    if vendor_tax_id:
        page.insert_text(fitz.Point(55, y + 15), f"GSTIN: {vendor_tax_id}", fontsize=10, fontname="helv", color=text_color)
    page.insert_text(fitz.Point(55, y + 30), f"Address: {vendor_address}", fontsize=8.5, fontname="helv", color=text_color)

    # Bill To Details
    page.insert_text(fitz.Point(55, y + 50), "Billed To: LedgerFlow Enterprise AP Solutions Ltd", fontsize=9, fontname="helv", color=text_color)
    page.insert_text(fitz.Point(55, y + 62), "GSTIN: 27AABCL9999Z1Z5 • Mumbai, MH 400051", fontsize=8.5, fontname="helv", color=(0.4, 0.4, 0.4))

    # Invoice Meta
    page.insert_text(fitz.Point(360, y), f"Invoice Number: {invoice_number or '[UNREADABLE]'}", fontsize=10, fontname="helv", color=text_color)
    page.insert_text(fitz.Point(360, y + 15), f"Invoice Date: {invoice_date or '[UNREADABLE]'}", fontsize=10, fontname="helv", color=text_color)
    page.insert_text(fitz.Point(360, y + 30), f"Purchase Order: {po_number or 'N/A'}", fontsize=10, fontname="helv", color=text_color)
    page.insert_text(fitz.Point(360, y + 45), "Currency: INR", fontsize=10, fontname="helv", color=text_color)
    page.insert_text(fitz.Point(360, y + 60), "Payment Terms: Net 30 Days", fontsize=8.5, fontname="helv", color=(0.4, 0.4, 0.4))

    # Divider line
    y = 195
    page.draw_line(fitz.Point(50, y), fitz.Point(545, y), color=line_color, width=1)

    # Table Header
    y = 215
    page.draw_rect(fitz.Rect(50, y - 12, 545, y + 8), color=None, fill=(0.92, 0.93, 0.96))
    page.insert_text(fitz.Point(55, y), "Description", fontsize=9, fontname="helv", color=primary_color)
    page.insert_text(fitz.Point(280, y), "Qty", fontsize=9, fontname="helv", color=primary_color)
    page.insert_text(fitz.Point(360, y), "Unit Price (INR)", fontsize=9, fontname="helv", color=primary_color)
    page.insert_text(fitz.Point(470, y), "Total (INR)", fontsize=9, fontname="helv", color=primary_color)

    # Table Rows
    y = 238
    for desc, qty, unit_price, line_tot in items:
        page.insert_text(fitz.Point(55, y), desc, fontsize=8.5, fontname="helv", color=text_color)
        page.insert_text(fitz.Point(285, y), qty, fontsize=8.5, fontname="helv", color=text_color)
        page.insert_text(fitz.Point(365, y), unit_price, fontsize=8.5, fontname="helv", color=text_color)
        page.insert_text(fitz.Point(470, y), line_tot, fontsize=8.5, fontname="helv", color=text_color)
        y += 22

    # Totals Section
    y += 15
    page.draw_line(fitz.Point(340, y), fitz.Point(545, y), color=line_color, width=1)
    y += 20
    if subtotal:
        page.insert_text(fitz.Point(360, y), "Subtotal:", fontsize=9.5, fontname="helv", color=text_color)
        page.insert_text(fitz.Point(470, y), f"INR {subtotal}", fontsize=9.5, fontname="helv", color=text_color)
        y += 18
    if tax_total:
        page.insert_text(fitz.Point(360, y), tax_label, fontsize=9.5, fontname="helv", color=text_color)
        page.insert_text(fitz.Point(470, y), f"INR {tax_total}", fontsize=9.5, fontname="helv", color=text_color)
        y += 18
    if grand_total:
        page.draw_line(fitz.Point(340, y - 5), fitz.Point(545, y - 5), color=primary_color, width=1.5)
        page.insert_text(fitz.Point(360, y + 10), "Grand Total:", fontsize=11, fontname="helv", color=primary_color)
        page.insert_text(fitz.Point(470, y + 10), f"INR {grand_total}", fontsize=11, fontname="helv", color=primary_color)

    # Bank Details & Footer Notes
    y += 50
    page.draw_rect(fitz.Rect(50, y, 545, y + 55), color=line_color, fill=(0.98, 0.98, 0.99))
    page.insert_text(fitz.Point(60, y + 16), "Remittance Bank Details: HDFC Bank Ltd • Current A/C: 50200088991122 • IFSC: HDFC0000240", fontsize=8, fontname="helv", color=(0.3, 0.3, 0.3))
    page.insert_text(fitz.Point(60, y + 32), "Authorized Signatory: This is a system generated electronically certified tax invoice.", fontsize=8, fontname="helv", color=(0.4, 0.4, 0.4))
    if notes:
        page.insert_text(fitz.Point(60, y + 46), f"Notes: {notes}", fontsize=8, fontname="helv", color=primary_color)

    out_path = os.path.join(OUT_DIR, filename)

    if make_image_scan:
        pix = page.get_pixmap(dpi=150)
        img_bytes = pix.tobytes("png")
        doc.close()

        scanned_doc = fitz.open()
        scanned_page = scanned_doc.new_page(width=595, height=842)
        scanned_page.insert_image(scanned_page.rect, stream=img_bytes)
        scanned_doc.save(out_path)
        scanned_doc.close()
    else:
        doc.save(out_path)
        doc.close()

    print(f"Generated: {filename}")


def generate_all():
    # -------------------------------------------------------------------------
    # PART 1: Standard Regression Test Scenarios (Preserved)
    # -------------------------------------------------------------------------
    create_invoice_pdf(
        filename="invoice_happy_path.pdf",
        vendor_name="Aster Office Supplies Pvt Ltd",
        vendor_tax_id="27ABCDE1234F1Z5",
        vendor_address="Plot 42, Bandra Kurla Complex, Mumbai, MH",
        invoice_number="AST-2026-041",
        invoice_date="2026-10-30",
        po_number="PO-1001",
        items=[("Ergonomic Mesh Office Chairs", "10", "8,000.00", "80,000.00")],
        subtotal="80,000.00",
        tax_total="14,400.00",
        grand_total="94,400.00",
        notes="Standard terms: Net 30 days.",
    )

    create_invoice_pdf(
        filename="invoice_duplicate_reformatted.pdf",
        vendor_name="Aster Office Supplies Pvt Ltd",
        vendor_tax_id="27ABCDE1234F1Z5",
        vendor_address="BKC Annex, Mumbai 400051",
        invoice_number="AST-2026-041",
        invoice_date="2026-10-30",
        po_number="PO-1001",
        items=[("Ergonomic Chairs (Itemised replacement bill)", "10", "8,000.00", "80,000.00")],
        subtotal="80,000.00",
        tax_total="14,400.00",
        grand_total="94,400.00",
        notes="Duplicate copy re-sent on vendor request.",
    )

    create_invoice_pdf(
        filename="invoice_split_1.pdf",
        vendor_name="Northstar IT Services Pvt Ltd",
        vendor_tax_id="29FGHIJ5678K2Y3",
        vendor_address="Electronic City Phase 1, Bengaluru, KA",
        invoice_number="NST-2026-101",
        invoice_date="2026-10-10",
        po_number="PO-2001",
        items=[("Cloud Infrastructure Milestone 1 Setup", "1", "40,000.00", "40,000.00")],
        subtotal="40,000.00",
        tax_total="0.00",
        grand_total="40,000.00",
        notes="Partial billing 1 of 2 against PO-2001.",
    )

    create_invoice_pdf(
        filename="invoice_split_2.pdf",
        vendor_name="Northstar IT Services Pvt Ltd",
        vendor_tax_id="29FGHIJ5678K2Y3",
        vendor_address="Electronic City Phase 1, Bengaluru, KA",
        invoice_number="NST-2026-102",
        invoice_date="2026-10-25",
        po_number="PO-2001",
        items=[("Cloud Infrastructure Milestone 2 Completion", "1", "60,000.00", "60,000.00")],
        subtotal="60,000.00",
        tax_total="0.00",
        grand_total="60,000.00",
        notes="Partial billing 2 of 2 against PO-2001.",
    )

    create_invoice_pdf(
        filename="invoice_split_3.pdf",
        vendor_name="Northstar IT Services Pvt Ltd",
        vendor_tax_id="29FGHIJ5678K2Y3",
        vendor_address="Electronic City Phase 1, Bengaluru, KA",
        invoice_number="NST-2026-103",
        invoice_date="2026-10-28",
        po_number="PO-2001",
        items=[("Cloud Support Additional Hours", "1", "1,000.00", "1,000.00")],
        subtotal="1,000.00",
        tax_total="0.00",
        grand_total="1,000.00",
        notes="Extra billing exceeding PO budget.",
    )

    create_invoice_pdf(
        filename="invoice_missing_po.pdf",
        vendor_name="Northstar IT Services Pvt Ltd",
        vendor_tax_id="29FGHIJ5678K2Y3",
        vendor_address="Electronic City Phase 1, Bengaluru, KA",
        invoice_number="NST-2026-880",
        invoice_date="2026-10-18",
        po_number=None,
        items=[("Software Licensing and Enterprise Maintenance", "1", "80,000.00", "80,000.00")],
        subtotal="80,000.00",
        tax_total="0.00",
        grand_total="80,000.00",
        notes="PO reference omitted by vendor.",
    )

    create_invoice_pdf(
        filename="invoice_low_quality_scan.pdf",
        vendor_name="BluePeak Logistics Pvt Ltd",
        vendor_tax_id="33KLMNO9012L3X4",
        vendor_address="Harbour Gateway Road, Chennai, TN",
        invoice_number="BP-2026-774",
        invoice_date="2026-10-20",
        po_number="PO-3001",
        items=[("Freight Shipping Inter-State Consignment", "1", "50,000.00", "50,000.00")],
        subtotal="50,000.00",
        tax_total="0.00",
        grand_total="50,000.00",
        notes="Image scan copy from transport depot.",
        make_image_scan=True,
    )

    create_invoice_pdf(
        filename="invoice_vendor_po_mismatch.pdf",
        vendor_name="Aster Office Supplies Pvt Ltd",
        vendor_tax_id="27ABCDE1234F1Z5",
        vendor_address="Plot 42, Bandra Kurla Complex, Mumbai, MH",
        invoice_number="AST-2026-999",
        invoice_date="2026-10-30",
        po_number="PO-3001",
        items=[("Desk Partition Dividers", "5", "5,000.00", "25,000.00")],
        subtotal="25,000.00",
        tax_total="0.00",
        grand_total="25,000.00",
    )

    create_invoice_pdf(
        filename="invoice_total_mismatch.pdf",
        vendor_name="Aster Office Supplies Pvt Ltd",
        vendor_tax_id="27ABCDE1234F1Z5",
        vendor_address="Plot 42, Bandra Kurla Complex, Mumbai, MH",
        invoice_number="AST-2026-404",
        invoice_date="2026-10-30",
        po_number="PO-1001",
        items=[("Filing Cabinets", "4", "20,000.00", "80,000.00")],
        subtotal="80,000.00",
        tax_total="10,000.00",
        grand_total="95,000.00",
    )

    # -------------------------------------------------------------------------
    # PART 2: Real-World Enterprise Production Testing Invoices
    # -------------------------------------------------------------------------

    # 10. Real Cloud Infrastructure: CloudScale Technologies (PO-7001)
    create_invoice_pdf(
        filename="real_aws_cloudscale_invoice.pdf",
        vendor_name="CloudScale Technologies India Pvt Ltd",
        vendor_tax_id="29AABCC1234F1Z8",
        vendor_address="Tower 3, Bagmane Tech Park, CV Raman Nagar, Bengaluru, KA 560093",
        invoice_number="CST-INV-2026-0891",
        invoice_date="2026-10-28",
        po_number="PO-7001",
        items=[
            ("Amazon EC2 Reserved Compute (m6i.4xlarge cluster)", "1", "4,20,000.00", "4,20,000.00"),
            ("Amazon Aurora PostgreSQL Multi-AZ Cluster", "1", "2,10,000.00", "2,10,000.00"),
            ("Amazon S3 Glacier & Hot Storage Tier", "1", "95,000.00", "95,000.00"),
        ],
        subtotal="7,25,000.00",
        tax_total="1,30,500.00",
        grand_total="8,55,500.00",
        notes="AWS Cloud Infrastructure Services for October 2026. Within PO-7001 budget.",
    )

    # 11. Real Engineering Hardware: Apex Computer Systems (PO-8001)
    create_invoice_pdf(
        filename="real_apex_macbooks_invoice.pdf",
        vendor_name="Apex Hardware & Computing Solutions Pvt Ltd",
        vendor_tax_id="07AABCA9012L1Z5",
        vendor_address="Plot 18, Okhla Industrial Area Phase III, New Delhi 110020",
        invoice_number="APX-2026-4412",
        invoice_date="2026-10-15",
        po_number="PO-8001",
        items=[
            ("Apple MacBook Pro 16\" (M3 Max, 64GB RAM, 1TB SSD)", "5", "2,00,000.00", "10,00,000.00"),
            ("CalDigit TS4 Thunderbolt 4 Docks", "10", "10,000.00", "1,00,000.00"),
        ],
        subtotal="11,00,000.00",
        tax_total="1,98,000.00",
        grand_total="12,98,000.00",
        notes="Batch 1 Delivery under PO-8001. Serial numbers verified with dispatch receipt.",
    )

    # 12. Real Corporate Legal Retainer: Veritas Advisory (PO-9001)
    create_invoice_pdf(
        filename="real_veritas_legal_invoice.pdf",
        vendor_name="Veritas Advisory & Legal Partners LLP",
        vendor_tax_id="36AABCV3456M1Z1",
        vendor_address="8th Floor, Financial District, Gachibowli, Hyderabad, TS 500032",
        invoice_number="VER-2026-0312",
        invoice_date="2026-10-25",
        po_number="PO-9001",
        items=[
            ("Monthly Corporate Legal Advisory Retainer (H2 FY26)", "1", "3,50,000.00", "3,50,000.00"),
            ("Global Data Privacy & Regulatory Compliance Assessment", "1", "1,50,000.00", "1,50,000.00"),
        ],
        subtotal="5,00,000.00",
        tax_total="90,000.00",
        grand_total="5,90,000.00",
        notes="Professional legal counsel and compliance audit. Billing against PO-9001.",
    )

    # 13. Real UI/UX & Design System: PixelCraft Creative (PO-12001)
    create_invoice_pdf(
        filename="real_pixelcraft_design_invoice.pdf",
        vendor_name="PixelCraft Creative & Digital Media Agency",
        vendor_tax_id="27AABCP1357Q1Z9",
        vendor_address="One BKC, G-Block, Bandra Kurla Complex, Mumbai, MH 400051",
        invoice_number="PXL-2026-788",
        invoice_date="2026-10-22",
        po_number="PO-12001",
        items=[
            ("Cross-Platform Design System Tokens & Components", "1", "4,60,000.00", "4,60,000.00"),
            ("Native iOS and Android Core UX Flow Prototypes", "1", "3,40,000.00", "3,40,000.00"),
        ],
        subtotal="8,00,000.00",
        tax_total="1,44,000.00",
        grand_total="9,44,000.00",
        notes="Milestones 1 & 2 signed off by VP Product. Linked to PO-12001.",
    )

    # 14. Real Multi-Item Cafeteria Supplies: GreenHorizon (PO-11002)
    create_invoice_pdf(
        filename="real_greenhorizon_pantry_invoice.pdf",
        vendor_name="GreenHorizon Workplace Facilities Pvt Ltd",
        vendor_tax_id="29AABCG2468P1Z6",
        vendor_address="4th Cross, Koramangala 4th Block, Bengaluru, KA 560034",
        invoice_number="GHF-2026-559",
        invoice_date="2026-10-20",
        po_number="PO-11002",
        items=[
            ("Specialty Arabica Roasted Whole Coffee Beans (40kg)", "40", "1,200.00", "48,000.00"),
            ("Barista Grade Oat Milk (100 Litres)", "100", "320.00", "32,000.00"),
            ("Organic Herbal Tea Assortment Boxes", "40", "500.00", "20,000.00"),
        ],
        subtotal="1,00,000.00",
        tax_total="18,000.00",
        grand_total="1,18,000.00",
        notes="October gourmet cafeteria supplies delivery. PO-11002 verified.",
    )

    # 15. Real Nationwide Cold Chain Freight: Velocity Express (PO-10001)
    create_invoice_pdf(
        filename="real_velocity_cargo_invoice.pdf",
        vendor_name="Velocity Express Cargo & Supply Chain Pvt Ltd",
        vendor_tax_id="24AABCV7890N1Z3",
        vendor_address="Transport Nagar, Narol Circle, Ahmedabad, GJ 382405",
        invoice_number="VEX-2026-1189",
        invoice_date="2026-10-18",
        po_number="PO-10001",
        items=[
            ("Refrigerated Container Linehaul Express (10 Trips)", "10", "24,000.00", "2,40,000.00"),
            ("Multi-hub Logistics Handling & Transit Insurance", "1", "1,40,000.00", "1,40,000.00"),
        ],
        subtotal="3,80,000.00",
        tax_total="19,000.00",
        tax_label="Tax Total (5% Transport GST):",
        grand_total="3,99,000.00",
        notes="All Consignment Notes (LRs) counter-signed by warehouse managers.",
    )

    # 16. Real Dedicated Telecom Leased Line: Redline Telecom (PO-13001)
    create_invoice_pdf(
        filename="real_redline_telecom_invoice.pdf",
        vendor_name="Redline Telecom & Enterprise Fibre Networks",
        vendor_tax_id="06AABCR9876R1Z4",
        vendor_address="Cyber City Tower B, DLF Phase 2, Gurugram, HR 122002",
        invoice_number="RLT-2026-9041",
        invoice_date="2026-10-01",
        po_number="PO-13001",
        items=[
            ("1 Gbps Symmetric Dedicated Internet Leased Line", "1", "3,60,000.00", "3,60,000.00"),
        ],
        subtotal="3,60,000.00",
        tax_total="64,800.00",
        grand_total="4,24,800.00",
        notes="Annual Advance Billing for Primary Internet Gateway. Circuit ID: ILL-BOM-0042.",
    )

    # 17. Unapproved Vendor Test: QuickFix Electronics (V-014 UNAPPROVED)
    create_invoice_pdf(
        filename="real_unapproved_quickfix_invoice.pdf",
        vendor_name="QuickFix Electronics & Hardware Repair",
        vendor_tax_id="27AAACQ1122S1Z1",
        vendor_address="Shop 14, Lamington Road, Grant Road, Mumbai, MH 400007",
        invoice_number="QFX-2026-081",
        invoice_date="2026-10-24",
        po_number="PO-14001",
        items=[
            ("Industrial Chiller Compressor Overhaul & Refrigerant Gas", "1", "85,000.00", "85,000.00"),
        ],
        subtotal="85,000.00",
        tax_total="15,300.00",
        grand_total="1,00,300.00",
        notes="Emergency weekend chiller repair. Vendor status is UNAPPROVED in master directory.",
    )

    # 18. Missing PO Candidate Suggestion Test: CyberShield Security (Matches PO-7003)
    create_invoice_pdf(
        filename="real_missing_po_cybershield.pdf",
        vendor_name="CyberShield Security Systems India LLP",
        vendor_tax_id="27AABCS5678K1Z2",
        vendor_address="Cyber Park, Hinjawadi Phase 2, Pune, MH 411057",
        invoice_number="CSS-2026-302",
        invoice_date="2026-10-14",
        po_number=None,  # Intentionally omitted!
        items=[
            ("CrowdStrike Falcon Insight XDR (120 Seats)", "120", "3,000.00", "3,60,000.00"),
            ("Falcon Complete 24/7 Managed Threat Hunting", "1", "2,00,000.00", "2,00,000.00"),
        ],
        subtotal="5,60,000.00",
        tax_total="1,00,800.00",
        grand_total="6,60,800.00",
        notes="CrowdStrike annual enterprise licenses. Tests candidate PO match in UI.",
    )

    # 19. PO Overbilling & Tolerance Cap Exceed Test: CloudScale (Exceeds PO-7001 by > ₹500 cap)
    create_invoice_pdf(
        filename="real_overbilling_cloudscale_invoice.pdf",
        vendor_name="CloudScale Technologies India Pvt Ltd",
        vendor_tax_id="29AABCC1234F1Z8",
        vendor_address="Tower 3, Bagmane Tech Park, CV Raman Nagar, Bengaluru, KA 560093",
        invoice_number="CST-INV-2026-9999",
        invoice_date="2026-10-31",
        po_number="PO-7001",
        items=[
            ("Amazon EC2 Compute High-Memory Instances (Surge Billing)", "1", "9,80,000.00", "9,80,000.00"),
        ],
        subtotal="9,80,000.00",
        tax_total="1,76,400.00",
        grand_total="11,56,400.00",
        notes="Unplanned surge compute capacity billing exceeding total PO-7001 value.",
    )


if __name__ == "__main__":
    generate_all()
