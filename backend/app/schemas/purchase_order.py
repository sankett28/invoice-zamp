import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from app.schemas.vendor import VendorResponse


class PurchaseOrderBase(BaseModel):
    po_number: str
    vendor_id: uuid.UUID
    currency: str = "INR"
    po_total: Decimal
    po_date: date
    status: str = "OPEN"
    description: str | None = None
    line_items: list[dict] | dict | None = None


class PurchaseOrderResponse(PurchaseOrderBase):
    id: uuid.UUID
    created_at: datetime
    remaining_balance: Decimal | None = None

    model_config = ConfigDict(from_attributes=True)
