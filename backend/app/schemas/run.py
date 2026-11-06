import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from pydantic import BaseModel, ConfigDict
from app.schemas.vendor import VendorResponse
from app.schemas.purchase_order import PurchaseOrderResponse


class UploadResponse(BaseModel):
    run_id: uuid.UUID
    processing_state: str
    message: str


class RunStageResponse(BaseModel):
    id: uuid.UUID
    run_id: uuid.UUID
    stage_key: str
    display_name: str
    status: str
    sequence: int
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_ms: int | None = None
    summary: str | None = None
    details: dict[str, Any] | None = None

    model_config = ConfigDict(from_attributes=True)


class RuleResultResponse(BaseModel):
    id: uuid.UUID
    run_id: uuid.UUID
    rule_id: str
    rule_name: str
    status: str
    severity: str
    actual_value: Any = None
    expected_value: Any = None
    message: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InvoiceDecisionResponse(BaseModel):
    id: uuid.UUID
    run_id: uuid.UUID
    status: str
    reason_codes: list[Any] = []
    summary: str
    recommended_action: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReviewEventResponse(BaseModel):
    id: uuid.UUID
    run_id: uuid.UUID
    action: str
    reviewer_label: str
    reason: str
    metadata_: dict[str, Any] | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ReviewRequest(BaseModel):
    action: str  # CONFIRM / RETURN / REJECT / ASSIGN_PO
    reviewer_label: str = "AP Reviewer"
    reason: str
    assigned_po_id: uuid.UUID | None = None
    po_id: uuid.UUID | None = None

    def model_post_init(self, __context):
        if self.po_id and not self.assigned_po_id:
            self.assigned_po_id = self.po_id


class RunSummary(BaseModel):
    id: uuid.UUID
    original_filename: str
    processing_state: str
    decision_status: str | None = None
    vendor_id: uuid.UUID | None = None
    purchase_order_id: uuid.UUID | None = None
    invoice_number: str | None = None
    invoice_date: date | None = None
    currency: str | None = None
    grand_total: Decimal | None = None
    decision_summary: str | None = None
    created_at: datetime
    completed_at: datetime | None = None

    vendor: VendorResponse | None = None
    purchase_order: PurchaseOrderResponse | None = None

    model_config = ConfigDict(from_attributes=True)


class RunDetailResponse(RunSummary):
    file_sha256: str
    file_size_bytes: int
    extracted_data: dict[str, Any] | None = None
    stages: list[RunStageResponse] = []
    rule_results: list[RuleResultResponse] = []
    decision: InvoiceDecisionResponse | None = None
    review_events: list[ReviewEventResponse] = []

    model_config = ConfigDict(from_attributes=True)
