from typing import Literal
from pydantic import BaseModel, Field


class FieldEvidence(BaseModel):
    """Evidence for a single extracted field."""
    raw_text: str | None = Field(None, description="Exact text found in the source document")
    page_number: int | None = Field(None, description="1-based page number where value was found")
    extraction_method: Literal["PDF_TEXT", "OCR", "VISION"] = "PDF_TEXT"
    confidence: float | None = Field(None, ge=0.0, le=1.0, description="Extraction confidence 0–1")


class VendorExtraction(BaseModel):
    name: str | None = Field(None, description="Vendor legal name as printed on the invoice")
    tax_id: str | None = Field(None, description="GST/tax registration number if present")
    vendor_id: str | None = Field(None, description="Vendor reference ID if printed")


class InvoiceDetails(BaseModel):
    number: str | None = Field(None, description="Invoice number / reference as printed")
    date: str | None = Field(None, description="Invoice date in YYYY-MM-DD format; null if ambiguous")
    due_date: str | None = Field(None, description="Payment due date in YYYY-MM-DD; null if not stated")
    currency: str | None = Field(None, description="ISO currency code, e.g. INR")
    po_number: str | None = Field(None, description="Purchase order reference if explicitly stated; null otherwise")


class AmountTotals(BaseModel):
    subtotal: str | None = Field(None, description="Pre-tax subtotal as a decimal string, e.g. '80000.00'")
    tax_total: str | None = Field(None, description="Total tax amount as a decimal string")
    discount_total: str | None = Field("0.00", description="Total discount as a decimal string")
    shipping_total: str | None = Field("0.00", description="Shipping/freight total as a decimal string")
    grand_total: str | None = Field(None, description="Invoice grand total as a decimal string")


class LineItem(BaseModel):
    description: str | None = None
    quantity: str | None = Field(None, description="Quantity as a decimal string")
    unit_price: str | None = Field(None, description="Unit price as a decimal string")
    tax_rate: str | None = Field(None, description="Tax rate percentage e.g. '18.0'")
    line_total: str | None = Field(None, description="Line total as a decimal string")


class ExtractionMeta(BaseModel):
    document_type: str | None = Field("invoice", description="'invoice', 'quote', 'statement', 'remittance', or 'unknown'")
    is_scanned_or_ocr: bool = Field(False, description="True if OCR or vision was used for any page")
    overall_confidence: float | None = Field(None, ge=0.0, le=1.0)
    notes: list[str] = Field(default_factory=list, description="Ambiguities, warnings, or notes")


class FieldEvidenceMap(BaseModel):
    """Evidence for each critical field — keyed by field path."""
    vendor_name: FieldEvidence | None = None
    vendor_tax_id: FieldEvidence | None = None
    invoice_number: FieldEvidence | None = None
    invoice_date: FieldEvidence | None = None
    currency: FieldEvidence | None = None
    po_number: FieldEvidence | None = None
    grand_total: FieldEvidence | None = None
    subtotal: FieldEvidence | None = None
    tax_total: FieldEvidence | None = None


class InvoiceExtractionResult(BaseModel):
    """Root object returned by the LLM."""
    vendor: VendorExtraction = Field(default_factory=VendorExtraction)
    invoice: InvoiceDetails = Field(default_factory=InvoiceDetails)
    amounts: AmountTotals = Field(default_factory=AmountTotals)
    line_items: list[LineItem] = Field(default_factory=list)
    extraction: ExtractionMeta = Field(default_factory=ExtractionMeta)
    evidence: FieldEvidenceMap = Field(default_factory=FieldEvidenceMap)
