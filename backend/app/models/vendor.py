import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Vendor(Base):
    __tablename__ = "vendors"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        default=uuid.uuid4,
        primary_key=True,
    )
    vendor_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    legal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    normalised_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    tax_id: Mapped[str | None] = mapped_column(String(50), nullable=True, unique=True, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="APPROVED")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    purchase_orders = relationship("PurchaseOrder", back_populates="vendor")
    invoice_runs = relationship("InvoiceRun", back_populates="vendor")
