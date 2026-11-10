import asyncio
import logging
import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import get_settings
from app.database import async_session_factory
from app.models.invoice_run import InvoiceRun
from app.models.rule_result import RuleResult
from app.models.invoice_decision import InvoiceDecision
from app.services.pdf_extractor import PDFExtractor
from app.services.ocr_service import OCRService
from app.services.llm_extractor import LLMExtractor
from app.services.vendor_matcher import VendorMatcher
from app.services.po_matcher import POMatcher
from app.services.duplicate_detector import DuplicateDetector, normalise_invoice_number
from app.services.reconciliation import (
    parse_decimal,
    reconcile_invoice_arithmetic,
    reconcile_line_items,
    calculate_po_balance,
)
from app.services.decision_engine import DecisionEngine
from app.workflow.stages import mark_stage_running, mark_stage_done, _clean_for_json

logger = logging.getLogger(__name__)
settings = get_settings()


class WorkflowRunner:
    def __init__(self):
        self.pdf_extractor = PDFExtractor()
        self.ocr_service = OCRService()
        self.llm_extractor = LLMExtractor()
        self.vendor_matcher = VendorMatcher()
        self.po_matcher = POMatcher()
        self.duplicate_detector = DuplicateDetector()
        self.decision_engine = DecisionEngine()

    async def execute_run(self, run_id: uuid.UUID, file_bytes: bytes) -> None:
        """
        Executes all 13 stages of the invoice workflow inside an async DB session.
        """
        async with async_session_factory() as db:
            try:
                # Set run to PROCESSING
                run_stmt = select(InvoiceRun).where(InvoiceRun.id == run_id)
                res = await db.execute(run_stmt)
                run = res.scalar_one()
                run.processing_state = "PROCESSING"
                await db.commit()

                # Stage 1: File Received (already done on upload)
                await mark_stage_done(
                    run_id, "file_received", "COMPLETED",
                    summary=f"Received '{run.original_filename}' ({len(file_bytes) / 1024:.1f} KB)",
                    details={"filename": run.original_filename, "size_bytes": len(file_bytes)},
                    db=db,
                )

                # Stage 2: File Validation
                await mark_stage_running(run_id, "file_validation", db)
                file_val = self.pdf_extractor.validate_pdf(
                    file_bytes, max_size_mb=settings.max_file_size_mb, max_pages=settings.max_page_count
                )
                if not file_val["valid"]:
                    await mark_stage_done(run_id, "file_validation", "FAILED", summary=file_val["error"], details=file_val, db=db)
                    await self._terminate_blocked(run_id, "Invalid PDF File", file_val["error"], db)
                    return

                await mark_stage_done(
                    run_id, "file_validation", "COMPLETED",
                    summary=f"PDF verified: {file_val['page_count']} page(s), valid structure",
                    details=file_val, db=db
                )

                # Stage 3: Exact Duplicate Check (SHA-256)
                await mark_stage_running(run_id, "duplicate_check_exact", db)
                exact_dup = await self.duplicate_detector.check_exact_file(run.file_sha256, run_id, db)
                if exact_dup["is_duplicate"]:
                    await mark_stage_done(run_id, "duplicate_check_exact", "FAILED", summary=exact_dup["message"], details=exact_dup, db=db)
                    await self._terminate_blocked(run_id, "Exact File Duplicate", exact_dup["message"], db)
                    return

                await mark_stage_done(
                    run_id, "duplicate_check_exact", "COMPLETED",
                    summary="SHA-256 hash is unique across invoice history", details=exact_dup, db=db
                )

                # Stage 4: Text Extraction
                await mark_stage_running(run_id, "text_extraction", db)
                text_result = self.pdf_extractor.extract_text(file_bytes)
                await mark_stage_done(
                    run_id, "text_extraction", "COMPLETED",
                    summary=f"Extracted {text_result['total_chars']} characters across {len(text_result['pages'])} page(s)",
                    details={"total_chars": text_result["total_chars"], "needs_ocr": text_result["needs_ocr"]},
                    db=db,
                )

                # Stage 5: OCR / Vision Fallback
                page_images = []
                ocr_needed = text_result["needs_ocr"]
                if ocr_needed:
                    await mark_stage_running(run_id, "ocr_fallback", db)
                    page_images = self.pdf_extractor.render_pages_to_images(file_bytes)
                    ocr_res = self.ocr_service.extract_from_pages(page_images)
                    combined_text = (text_result["full_text"] + "\n\n" + ocr_res["full_text"]).strip()
                    await mark_stage_done(
                        run_id, "ocr_fallback", "COMPLETED",
                        summary=f"OCR processed {len(page_images)} page(s) ({ocr_res['total_chars']} chars extracted)",
                        details={"ocr_chars": ocr_res["total_chars"]},
                        db=db,
                    )
                else:
                    combined_text = text_result["full_text"]
                    await mark_stage_done(
                        run_id, "ocr_fallback", "SKIPPED",
                        summary="Sufficient selectable text available; OCR fallback bypassed",
                        details={}, db=db
                    )

                # Stage 6: AI Field Extraction
                await mark_stage_running(run_id, "llm_extraction", db)
                if ocr_needed and page_images:
                    extraction = await self.llm_extractor.extract_from_images(page_images)
                else:
                    extraction = await self.llm_extractor.extract_from_text(combined_text)

                ext_summary = (
                    f"Extracted invoice #{extraction.invoice.number or 'N/A'}, "
                    f"Vendor: '{extraction.vendor.name or 'N/A'}', "
                    f"Total: INR {extraction.amounts.grand_total or 'N/A'}"
                )
                await mark_stage_done(
                    run_id, "llm_extraction", "COMPLETED",
                    summary=ext_summary,
                    details=extraction.model_dump(),
                    db=db,
                )

                # Update run record with extracted fields
                run.invoice_number = extraction.invoice.number
                run.invoice_number_normalised = normalise_invoice_number(extraction.invoice.number)
                run.currency = extraction.invoice.currency or "INR"
                run.grand_total = parse_decimal(extraction.amounts.grand_total)
                if extraction.invoice.date:
                    try:
                        run.invoice_date = date.fromisoformat(extraction.invoice.date)
                    except ValueError:
                        pass
                run.extracted_data = extraction.model_dump()
                await db.commit()

                # Stage 7: Extraction Validation
                await mark_stage_running(run_id, "extraction_validation", db)
                missing = []
                if not (extraction.vendor.name or extraction.vendor.tax_id):
                    missing.append("Vendor")
                if not extraction.invoice.number:
                    missing.append("Invoice Number")
                if not extraction.amounts.grand_total:
                    missing.append("Grand Total")

                val_status = "NEEDS_ATTENTION" if missing else "COMPLETED"
                val_summary = f"Missing required fields: {', '.join(missing)}" if missing else "Schema, types, and required fields validated"
                await mark_stage_done(run_id, "extraction_validation", val_status, summary=val_summary, details={"missing": missing}, db=db)

                # Stage 8: Vendor Validation
                await mark_stage_running(run_id, "vendor_validation", db)
                vendor_match = await self.vendor_matcher.match_vendor(
                    extraction.vendor.name, extraction.vendor.tax_id, db
                )
                vendor_details = {
                    "matched": vendor_match["matched"],
                    "match_method": vendor_match["match_method"],
                    "confidence": vendor_match["confidence"],
                    "message": vendor_match["message"],
                    "vendor_code": vendor_match["vendor"].vendor_code if vendor_match.get("vendor") else None,
                    "legal_name": vendor_match["vendor"].legal_name if vendor_match.get("vendor") else None,
                }
                if vendor_match["matched"] and vendor_match["vendor"]:
                    run.vendor_id = vendor_match["vendor"].id
                    await db.commit()
                    v_stat = "COMPLETED" if vendor_match["vendor"].status == "APPROVED" else "NEEDS_ATTENTION"
                    await mark_stage_done(run_id, "vendor_validation", v_stat, summary=vendor_match["message"], details=vendor_details, db=db)
                else:
                    await mark_stage_done(run_id, "vendor_validation", "NEEDS_ATTENTION", summary=vendor_match["message"], details=vendor_details, db=db)

                # Stage 9: PO Matching
                await mark_stage_running(run_id, "po_matching", db)
                po_match = await self.po_matcher.match_po(
                    po_number=extraction.invoice.po_number,
                    vendor_id=run.vendor_id,
                    currency=run.currency,
                    invoice_total=run.grand_total,
                    db=db,
                )
                po_details = {
                    "matched": po_match["matched"],
                    "match_type": po_match["match_type"],
                    "requires_review": po_match["requires_review"],
                    "message": po_match["message"],
                    "po_number": po_match["po"].po_number if po_match.get("po") else None,
                    "candidates": [
                        {
                            "po_number": c.get("po_number"),
                            "po_total": str(c.get("po_total")),
                            "score": c.get("score"),
                            "reasons": c.get("reasons"),
                        }
                        for c in po_match.get("candidates", [])
                    ],
                }
                if po_match["matched"] and po_match["po"]:
                    run.purchase_order_id = po_match["po"].id
                    await db.commit()
                    po_stat = "NEEDS_ATTENTION" if po_match["requires_review"] else "COMPLETED"
                    await mark_stage_done(run_id, "po_matching", po_stat, summary=po_match["message"], details=po_details, db=db)
                else:
                    await mark_stage_done(run_id, "po_matching", "NEEDS_ATTENTION", summary=po_match["message"], details=po_details, db=db)

                # Stage 10: Business Duplicate Check
                await mark_stage_running(run_id, "duplicate_check_business", db)
                biz_dup = await self.duplicate_detector.check_business_duplicate(
                    vendor_id=run.vendor_id,
                    invoice_number=run.invoice_number,
                    invoice_date=run.invoice_date,
                    grand_total=run.grand_total,
                    current_run_id=run_id,
                    db=db,
                )
                dup_stat = "FAILED" if biz_dup["tier"] == "business_key" else ("NEEDS_ATTENTION" if biz_dup["tier"] == "possible" else "COMPLETED")
                dup_summary = biz_dup["message"] or "No duplicate invoice recorded for this vendor"
                await mark_stage_done(run_id, "duplicate_check_business", dup_stat, summary=dup_summary, details=biz_dup, db=db)

                # Stage 11: Financial Reconciliation
                await mark_stage_running(run_id, "financial_reconciliation", db)
                subtotal_dec = parse_decimal(extraction.amounts.subtotal)
                tax_dec = parse_decimal(extraction.amounts.tax_total)
                disc_dec = parse_decimal(extraction.amounts.discount_total)
                ship_dec = parse_decimal(extraction.amounts.shipping_total)
                rounding_allow = Decimal(str(settings.rounding_allowance_inr))

                arith_result = reconcile_invoice_arithmetic(
                    subtotal=subtotal_dec,
                    tax_total=tax_dec,
                    discount_total=disc_dec,
                    shipping_total=ship_dec,
                    grand_total=run.grand_total,
                    rounding_allowance=rounding_allow,
                )
                line_items_data = [item.model_dump() for item in extraction.line_items]
                line_result = reconcile_line_items(line_items_data)

                fin_stat = "COMPLETED" if arith_result["passes"] else "NEEDS_ATTENTION"
                await mark_stage_done(
                    run_id, "financial_reconciliation", fin_stat,
                    summary=arith_result["message"],
                    details={"arithmetic": arith_result, "line_items": line_result},
                    db=db,
                )

                # Stage 12: PO Balance Check
                await mark_stage_running(run_id, "po_balance_check", db)
                po_balance_data = {}
                if run.purchase_order_id and run.grand_total:
                    prior_commit, rem_balance = await self.po_matcher.get_remaining_balance(
                        run.purchase_order_id, run_id, db
                    )
                    po_obj = po_match.get("po")
                    po_tot = Decimal(str(po_obj.po_total)) if po_obj else (prior_commit + rem_balance)
                    po_balance_data = calculate_po_balance(
                        po_total=po_tot,
                        prior_committed=prior_commit,
                        invoice_total=run.grand_total,
                        tolerance_percent=settings.tolerance_percent,
                        tolerance_cap=Decimal(str(settings.tolerance_cap_inr)),
                    )
                    bal_stat = "COMPLETED" if po_balance_data["passes"] else "NEEDS_ATTENTION"
                    await mark_stage_done(run_id, "po_balance_check", bal_stat, summary=po_balance_data["message"], details=po_balance_data, db=db)
                else:
                    await mark_stage_done(
                        run_id, "po_balance_check", "SKIPPED",
                        summary="PO balance check skipped (no confirmed PO attached)",
                        details={}, db=db
                    )

                # Stage 13: Decision Engine
                await mark_stage_running(run_id, "decision_engine", db)
                context = {
                    "file_validation": file_val,
                    "exact_duplicate": exact_dup,
                    "extraction": extraction,
                    "vendor_match": vendor_match,
                    "po_match": po_match,
                    "business_duplicate": biz_dup,
                    "arithmetic_reconciliation": arith_result,
                    "line_item_reconciliation": line_result,
                    "po_balance": po_balance_data,
                }
                decision_output = self.decision_engine.evaluate(context)

                # Persist Rule Results
                for r in decision_output["rule_results"]:
                    rule_row = RuleResult(
                        run_id=run_id,
                        rule_id=r["rule_id"],
                        rule_name=r["rule_name"],
                        status=r["status"],
                        severity=r["severity"],
                        actual_value=_clean_for_json(r.get("actual_value")),
                        expected_value=_clean_for_json(r.get("expected_value")),
                        message=r["message"],
                    )
                    db.add(rule_row)

                # Generate AI Executive Briefing / Summary
                attention_rules = [
                    f"{r['rule_name']}: {r['message']}"
                    for r in decision_output["rule_results"]
                    if r["status"] in ("FAIL", "WARNING")
                ]
                passed_count = sum(1 for r in decision_output["rule_results"] if r["status"] == "PASS")

                v_obj = vendor_match.get("vendor")
                v_name = v_obj.legal_name if v_obj else (getattr(extraction, "vendor", None) and extraction.vendor.name)
                po_obj = po_match.get("po")
                po_num = po_obj.po_number if po_obj else None
                po_tot_str = str(po_obj.po_total) if po_obj else None
                po_rem_str = str(po_balance_data.get("remaining_before")) if po_balance_data else None
                po_rem_after_str = str(po_balance_data.get("remaining_after")) if po_balance_data else None

                ai_summary = await self.llm_extractor.generate_run_summary(
                    vendor_name=v_name,
                    invoice_number=run.invoice_number,
                    grand_total=str(run.grand_total) if run.grand_total else None,
                    currency=run.currency,
                    po_number=po_num,
                    po_total=po_tot_str,
                    po_remaining_before=po_rem_str,
                    po_remaining_after=po_rem_after_str,
                    decision_status=decision_output["status"],
                    attention_rules=attention_rules,
                    passed_rules_count=passed_count,
                )

                # Persist Decision
                decision_row = InvoiceDecision(
                    run_id=run_id,
                    status=decision_output["status"],
                    reason_codes=decision_output["reason_codes"],
                    summary=ai_summary,
                    recommended_action=decision_output["recommended_action"],
                )
                db.add(decision_row)

                # Update Run Status
                run.decision_status = decision_output["status"]
                run.decision_summary = ai_summary
                run.processing_state = "COMPLETED"
                run.completed_at = datetime.utcnow()
                await db.commit()

                await mark_stage_done(
                    run_id, "decision_engine", "COMPLETED",
                    summary=f"Final Decision: {decision_output['status']}. {decision_output['summary']}",
                    details=decision_output,
                    db=db,
                )

            except Exception as e:
                logger.exception(f"Unhandled error in workflow runner for run {run_id}: {e}")
                # Mark run as FAILED
                try:
                    run_stmt = select(InvoiceRun).where(InvoiceRun.id == run_id)
                    res = await db.execute(run_stmt)
                    run = res.scalar_one_or_none()
                    if run:
                        run.processing_state = "FAILED"
                        run.decision_summary = f"System error occurred during processing: {str(e)}"
                        run.completed_at = datetime.utcnow()
                        await db.commit()
                except Exception:
                    pass

    async def _terminate_blocked(self, run_id: uuid.UUID, reason_title: str, reason_detail: str, db: AsyncSession) -> None:
        """Helper to safely abort on immediate block rules like exact duplicate or corrupt file."""
        run_stmt = select(InvoiceRun).where(InvoiceRun.id == run_id)
        res = await db.execute(run_stmt)
        run = res.scalar_one_or_none()
        if run:
            run.decision_status = "BLOCKED"
            run.decision_summary = f"{reason_title}: {reason_detail}"
            run.processing_state = "COMPLETED"
            run.completed_at = datetime.utcnow()

            decision_row = InvoiceDecision(
                run_id=run_id,
                status="BLOCKED",
                reason_codes=["BLOCKED_EARLY"],
                summary=f"{reason_title}: {reason_detail}",
                recommended_action="Do not process this invoice. Address the blocker.",
            )
            db.add(decision_row)
            await db.commit()

        await mark_stage_done(
            run_id, "decision_engine", "COMPLETED",
            summary=f"Final Decision: BLOCKED. {reason_detail}",
            details={"blocked": True, "reason": reason_detail},
            db=db,
        )
