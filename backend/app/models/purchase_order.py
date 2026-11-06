import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, DateTime, Date, Numeric, Text, ForeignKey, JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        default=uuid.uuid4,
        primary_key=True,
    )
    po_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("vendors.id"),
        nullable=False,
        index=True,
    )
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    po_total: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    po_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="OPEN", index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    line_items: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    vendor = relationship("Vendor", back_populates="purchase_orders")
    invoice_runs = relationship("InvoiceRun", back_populates="purchase_order")
