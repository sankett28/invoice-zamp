import io
import pytesseract
from PIL import Image
from app.config import get_settings

settings = get_settings()


class OCRService:
    def __init__(self):
        if settings.tessdata_prefix:
            pytesseract.pytesseract.tessdata_dir = settings.tessdata_prefix

    def extract_text_from_image_bytes(self, image_bytes: bytes, lang: str | None = None) -> str:
        """Runs Tesseract OCR on a single PNG/JPEG byte stream."""
        lang = lang or settings.tesseract_lang
        try:
            image = Image.open(io.BytesIO(image_bytes))
            text = pytesseract.image_to_string(image, lang=lang)
            return text or ""
        except Exception as e:
            # If tesseract is not installed locally, return graceful message
            return f"[OCR fallback unavailable: {str(e)}]"

    def extract_from_pages(self, page_images: list[bytes]) -> dict:
        """
        Runs OCR across all rendered page images.
        """
        pages = []
        full_text_parts = []
        total_chars = 0

        for idx, img_bytes in enumerate(page_images):
            page_num = idx + 1
            text = self.extract_text_from_image_bytes(img_bytes)
            char_count = len(text.strip())
            total_chars += char_count

            pages.append({
                "page": page_num,
                "text": text,
                "char_count": char_count,
            })
            full_text_parts.append(f"--- Page {page_num} (OCR) ---\n{text}")

        return {
            "pages": pages,
            "full_text": "\n\n".join(full_text_parts),
            "total_chars": total_chars,
            "is_ocr": True,
        }
