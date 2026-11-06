import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, ForeignKey, JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class RuleResult(Base):
    __tablename__ = "rule_results"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        default=uuid.uuid4,
        primary_key=True,
    )
    run_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("invoice_runs.id"),
        nullable=False,
        index=True,
    )
    rule_id: Mapped[str] = mapped_column(String(10), nullable=False)
    rule_name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # PASS / FAIL / WARNING / NOT_APPLICABLE
    severity: Mapped[str] = mapped_column(String(10), nullable=False)  # INFO / REVIEW / BLOCK
    actual_value: Mapped[dict | list | str | None] = mapped_column(JSON, nullable=True)
    expected_value: Mapped[dict | list | str | None] = mapped_column(JSON, nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    run = relationship("InvoiceRun", back_populates="rule_results")
