import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, DateTime, Date, Numeric, Integer, Text, ForeignKey, JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class InvoiceRun(Base):
    __tablename__ = "invoice_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        default=uuid.uuid4,
        primary_key=True,
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)

    processing_state: Mapped[str] = mapped_column(String(20), nullable=False, default="QUEUED", index=True)
    decision_status: Mapped[str | None] = mapped_column(String(30), nullable=True, index=True)

    vendor_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("vendors.id"),
        nullable=True,
        index=True,
    )
    purchase_order_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("purchase_orders.id"),
        nullable=True,
        index=True,
    )

    invoice_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    invoice_number_normalised: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    invoice_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    currency: Mapped[str | None] = mapped_column(String(10), nullable=True)
    grand_total: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    extracted_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    decision_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    vendor = relationship("Vendor", back_populates="invoice_runs")
    purchase_order = relationship("PurchaseOrder", back_populates="invoice_runs")
    stages = relationship("RunStage", back_populates="run", cascade="all, delete-orphan", order_by="RunStage.sequence")
    rule_results = relationship("RuleResult", back_populates="run", cascade="all, delete-orphan")
    decision = relationship("InvoiceDecision", back_populates="run", uselist=False, cascade="all, delete-orphan")
    review_events = relationship("ReviewEvent", back_populates="run", cascade="all, delete-orphan", order_by="ReviewEvent.created_at")
