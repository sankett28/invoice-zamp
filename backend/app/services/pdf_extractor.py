import hashlib
import io
import fitz  # PyMuPDF


class PDFExtractor:
    MIN_TEXT_LENGTH_PER_PAGE = 40  # characters below which we consider the page scanned

    def validate_pdf(self, file_bytes: bytes, max_size_mb: int = 10, max_pages: int = 20) -> dict:
        """
        Validates magic bytes, file size, readability, and page limits.
        """
        # 1. Size check
        size_bytes = len(file_bytes)
        if size_bytes == 0:
            return {"valid": False, "error": "Uploaded file is empty (0 bytes).", "page_count": 0}
        if size_bytes > max_size_mb * 1024 * 1024:
            return {
                "valid": False,
                "error": f"File size ({size_bytes / (1024*1024):.1f}MB) exceeds limit of {max_size_mb}MB.",
                "page_count": 0,
            }

        # 2. Magic bytes check
        if not file_bytes.startswith(b"%PDF"):
            return {
                "valid": False,
                "error": "Invalid file format. The file is not a valid PDF document.",
                "page_count": 0,
            }

        # 3. PyMuPDF readability & page count check
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            page_count = doc.page_count
            if page_count == 0:
                doc.close()
                return {"valid": False, "error": "PDF contains no pages.", "page_count": 0}
            if page_count > max_pages:
                doc.close()
                return {
                    "valid": False,
                    "error": f"PDF page count ({page_count}) exceeds limit of {max_pages} pages.",
                    "page_count": page_count,
                }
            if doc.is_encrypted:
                doc.close()
                return {
                    "valid": False,
                    "error": "PDF is password-protected or encrypted. Unencrypted files required.",
                    "page_count": page_count,
                }
            doc.close()
            return {"valid": True, "error": None, "page_count": page_count}
        except Exception as e:
            return {"valid": False, "error": f"Unable to parse PDF: {str(e)}", "page_count": 0}

    def compute_sha256(self, file_bytes: bytes) -> str:
        """Calculates hex SHA-256 for exact duplicate detection."""
        return hashlib.sha256(file_bytes).hexdigest()

    def extract_text(self, file_bytes: bytes) -> dict:
        """
        Extracts selectable text per page.
        Returns:
            {
                "pages": [{"page": 1, "text": "...", "char_count": 123}],
                "full_text": "...",
                "total_chars": int,
                "needs_ocr": bool
            }
        """
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages = []
        full_text_parts = []
        needs_ocr = False

        for idx, page in enumerate(doc):
            page_num = idx + 1
            text = page.get_text() or ""
            clean_text = text.strip()
            char_count = len(clean_text)

            pages.append({
                "page": page_num,
                "text": text,
                "char_count": char_count,
            })
            full_text_parts.append(f"--- Page {page_num} ---\n{text}")

            if char_count < self.MIN_TEXT_LENGTH_PER_PAGE:
                needs_ocr = True

        doc.close()
        full_text = "\n\n".join(full_text_parts)
        total_chars = sum(p["char_count"] for p in pages)

        # If full text has virtually no chars, definitely needs OCR
        if total_chars < 50:
            needs_ocr = True

        return {
            "pages": pages,
            "full_text": full_text,
            "total_chars": total_chars,
            "needs_ocr": needs_ocr,
        }

    def render_pages_to_images(self, file_bytes: bytes, dpi: int = 150) -> list[bytes]:
        """
        Renders PDF pages to PNG byte streams for vision multimodal models / OCR fallback.
        """
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        images = []
        # Render at requested DPI (default 150 is optimal balance of speed and clarity)
        zoom = dpi / 72.0
        matrix = fitz.Matrix(zoom, zoom)

        for page in doc:
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            images.append(pix.tobytes("png"))

        doc.close()
        return images
