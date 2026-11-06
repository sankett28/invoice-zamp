import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class VendorBase(BaseModel):
    vendor_code: str
    legal_name: str
    tax_id: str | None = None
    status: str = "APPROVED"


class VendorResponse(VendorBase):
    id: uuid.UUID
    normalised_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
