from pathlib import Path
import pytest
from app.services.pdf_extractor import PDFExtractor

SAMPLE_DIR = Path(__file__).resolve().parent.parent.parent / "sample_data" / "invoices"


def test_pdf_validation_valid():
    extractor = PDFExtractor()
    happy_pdf_path = SAMPLE_DIR / "invoice_happy_path.pdf"
    assert happy_pdf_path.exists()

    with open(happy_pdf_path, "rb") as f:
        file_bytes = f.read()

    res = extractor.validate_pdf(file_bytes)
    assert res["valid"] is True
    assert res["error"] is None
    assert res["page_count"] >= 1


def test_pdf_validation_empty_bytes():
    extractor = PDFExtractor()
    res = extractor.validate_pdf(b"")
    assert res["valid"] is False
    assert "empty" in res["error"].lower()


def test_pdf_validation_invalid_magic_bytes():
    extractor = PDFExtractor()
    res = extractor.validate_pdf(b"NOT A PDF FILE DATA")
    assert res["valid"] is False
    assert "not a valid pdf" in res["error"].lower()


def test_pdf_validation_size_limit():
    extractor = PDFExtractor()
    dummy_bytes = b"%PDF-1.4 " + b"0" * 1024
    res = extractor.validate_pdf(dummy_bytes, max_size_mb=0)  # limit 0 MB
    assert res["valid"] is False
    assert "exceeds limit" in res["error"].lower()


def test_sha256_computation():
    extractor = PDFExtractor()
    data1 = b"%PDF-1.4 test data 1"
    data2 = b"%PDF-1.4 test data 2"
    hash1 = extractor.compute_sha256(data1)
    hash2 = extractor.compute_sha256(data2)
    assert len(hash1) == 64
    assert hash1 != hash2
    assert hash1 == extractor.compute_sha256(data1)


def test_extract_text_digital_pdf():
    extractor = PDFExtractor()
    happy_pdf_path = SAMPLE_DIR / "invoice_happy_path.pdf"
    with open(happy_pdf_path, "rb") as f:
        file_bytes = f.read()

    res = extractor.extract_text(file_bytes)
    assert res["total_chars"] > 100
    assert "Aster Office Supplies" in res["full_text"]
    assert res["needs_ocr"] is False


def test_extract_text_scanned_pdf():
    extractor = PDFExtractor()
    scanned_path = SAMPLE_DIR / "invoice_low_quality_scan.pdf"
    with open(scanned_path, "rb") as f:
        file_bytes = f.read()

    res = extractor.extract_text(file_bytes)
    # Scanned PDF is an image without selectable text, so needs_ocr must be True
    assert res["needs_ocr"] is True


def test_render_pages_to_images():
    extractor = PDFExtractor()
    happy_pdf_path = SAMPLE_DIR / "invoice_happy_path.pdf"
    with open(happy_pdf_path, "rb") as f:
        file_bytes = f.read()

    images = extractor.render_pages_to_images(file_bytes, dpi=100)
    assert len(images) >= 1
    # Check PNG magic bytes
    assert images[0].startswith(b"\x89PNG\r\n\x1a\n")
