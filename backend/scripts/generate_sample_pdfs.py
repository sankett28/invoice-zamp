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
    make_image_scan: bool = False,
):
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4 size

    # Colors
    primary_color = (0.1, 0.2, 0.4)
    text_color = (0.15, 0.15, 0.15)
    line_color = (0.8, 0.8, 0.8)

    # Header Banner
    page.draw_rect(fitz.Rect(40, 40, 555, 90), color=None, fill=(0.95, 0.96, 0.98))
    page.insert_text(fitz.Point(55, 72), vendor_name, fontsize=18, fontname="helv", color=primary_color)
    page.insert_text(fitz.Point(450, 72), "TAX INVOICE", fontsize=14, fontname="helv", color=primary_color)

    y = 110
    # Vendor & Bill To Details
    page.insert_text(fitz.Point(55, y), f"Vendor: {vendor_name}", fontsize=10, fontname="helv", color=text_color)
    if vendor_tax_id:
        page.insert_text(fitz.Point(55, y + 15), f"GSTIN: {vendor_tax_id}", fontsize=10, fontname="helv", color=text_color)
    page.insert_text(fitz.Point(55, y + 30), f"Address: {vendor_address}", fontsize=9, fontname="helv", color=text_color)

    # Invoice Meta
    page.insert_text(fitz.Point(360, y), f"Invoice Number: {invoice_number or '[UNREADABLE]'}", fontsize=10, fontname="helv", color=text_color)
    page.insert_text(fitz.Point(360, y + 15), f"Invoice Date: {invoice_date or '[UNREADABLE]'}", fontsize=10, fontname="helv", color=text_color)
    page.insert_text(fitz.Point(360, y + 30), f"Purchase Order: {po_number or 'N/A'}", fontsize=10, fontname="helv", color=text_color)
    page.insert_text(fitz.Point(360, y + 45), "Currency: INR", fontsize=10, fontname="helv", color=text_color)

    # Divider line
    y = 175
    page.draw_line(fitz.Point(50, y), fitz.Point(545, y), color=line_color, width=1)

    # Table Header
    y = 195
    page.draw_rect(fitz.Rect(50, y - 12, 545, y + 8), color=None, fill=(0.92, 0.93, 0.96))
    page.insert_text(fitz.Point(55, y), "Description", fontsize=9, fontname="helv", color=primary_color)
    page.insert_text(fitz.Point(280, y), "Qty", fontsize=9, fontname="helv", color=primary_color)
    page.insert_text(fitz.Point(360, y), "Unit Price (INR)", fontsize=9, fontname="helv", color=primary_color)
    page.insert_text(fitz.Point(470, y), "Total (INR)", fontsize=9, fontname="helv", color=primary_color)

    # Table Rows
    y = 220
    for desc, qty, unit_price, line_tot in items:
        page.insert_text(fitz.Point(55, y), desc, fontsize=9, fontname="helv", color=text_color)
        page.insert_text(fitz.Point(285, y), qty, fontsize=9, fontname="helv", color=text_color)
        page.insert_text(fitz.Point(370, y), unit_price, fontsize=9, fontname="helv", color=text_color)
        page.insert_text(fitz.Point(475, y), line_tot, fontsize=9, fontname="helv", color=text_color)
        y += 22

    # Totals Section
    y += 15
    page.draw_line(fitz.Point(340, y), fitz.Point(545, y), color=line_color, width=1)
    y += 20
    if subtotal:
        page.insert_text(fitz.Point(360, y), "Subtotal:", fontsize=10, fontname="helv", color=text_color)
        page.insert_text(fitz.Point(475, y), f"INR {subtotal}", fontsize=10, fontname="helv", color=text_color)
        y += 18
    if tax_total:
        page.insert_text(fitz.Point(360, y), "Tax Total (18% GST):", fontsize=10, fontname="helv", color=text_color)
        page.insert_text(fitz.Point(475, y), f"INR {tax_total}", fontsize=10, fontname="helv", color=text_color)
        y += 18
    if grand_total:
        page.draw_line(fitz.Point(340, y - 5), fitz.Point(545, y - 5), color=primary_color, width=1.5)
        page.insert_text(fitz.Point(360, y + 10), "Grand Total:", fontsize=11, fontname="helv", color=primary_color)
        page.insert_text(fitz.Point(475, y + 10), f"INR {grand_total}", fontsize=11, fontname="helv", color=primary_color)

    if notes:
        y += 60
        page.insert_text(fitz.Point(55, y), f"Notes: {notes}", fontsize=8, fontname="helv", color=(0.4, 0.4, 0.4))

    out_path = os.path.join(OUT_DIR, filename)

    if make_image_scan:
        # Convert page to rendered raster image and embed as a scanned page (no selectable text)
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
    # 1. Happy Path: Aster Office Supplies, PO-1001, INR 94,400.00
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

    # 2. Duplicate Reformatted (EC-1): Same vendor and invoice number, different layout/text
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

    # 3. Split PO Invoice 1 (EC-2): PO-2001 (Total ₹100,000), Billing ₹40,000
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

    # 4. Split PO Invoice 2 (EC-2): PO-2001, Billing remaining ₹60,000
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

    # 5. Split PO Invoice 3 (EC-2 Overbilling): Attempting ₹1,000 after balance is ₹0
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

    # 6. Missing PO Reference (EC-3): Northstar IT Services, amount ₹80,000 (Matches PO-2002 candidate)
    create_invoice_pdf(
        filename="invoice_missing_po.pdf",
        vendor_name="Northstar IT Services Pvt Ltd",
        vendor_tax_id="29FGHIJ5678K2Y3",
        vendor_address="Electronic City Phase 1, Bengaluru, KA",
        invoice_number="NST-2026-880",
        invoice_date="2026-10-18",
        po_number=None,  # Missing PO!
        items=[("Software Licensing and Enterprise Maintenance", "1", "80,000.00", "80,000.00")],
        subtotal="80,000.00",
        tax_total="0.00",
        grand_total="80,000.00",
        notes="PO reference omitted by vendor.",
    )

    # 7. Scanned / Low Quality Scan (EC-4): Rendered as image-only PDF with unclear invoice number
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

    # 8. Vendor PO Mismatch: Aster invoice referencing BluePeak PO-3001
    create_invoice_pdf(
        filename="invoice_vendor_po_mismatch.pdf",
        vendor_name="Aster Office Supplies Pvt Ltd",
        vendor_tax_id="27ABCDE1234F1Z5",
        vendor_address="Plot 42, Bandra Kurla Complex, Mumbai, MH",
        invoice_number="AST-2026-999",
        invoice_date="2026-10-30",
        po_number="PO-3001",  # PO-3001 belongs to V-003, not V-001!
        items=[("Desk Partition Dividers", "5", "5,000.00", "25,000.00")],
        subtotal="25,000.00",
        tax_total="0.00",
        grand_total="25,000.00",
    )

    # 9. Total Arithmetic Mismatch: Subtotal 80k + Tax 10k != Declared 95k
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
        grand_total="95,000.00",  # 80k + 10k != 95k! Discrepancy of 5,000
    )


if __name__ == "__main__":
    generate_all()
