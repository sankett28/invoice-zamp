from enum import Enum
from decimal import Decimal
from typing import Any
from app.schemas.invoice_extraction import InvoiceExtractionResult


class DecisionStatus(str, Enum):
    READY_FOR_AP_APPROVAL = "READY_FOR_AP_APPROVAL"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    BLOCKED = "BLOCKED"


class RuleStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    WARNING = "WARNING"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class RuleSeverity(str, Enum):
    INFO = "INFO"
    REVIEW = "REVIEW"
    BLOCK = "BLOCK"


class DecisionEngine:
    """
    Deterministic business rules and AP decision engine.
    Applies rules in order and preserves all findings.
    """

    def evaluate(self, context: dict[str, Any]) -> dict[str, Any]:
        """
        Evaluates context dictionary containing outputs from workflow stages:
        - file_validation
        - exact_duplicate
        - extraction (InvoiceExtractionResult or dict)
        - vendor_match
        - po_match
        - business_duplicate
        - arithmetic_reconciliation
        - line_item_reconciliation
        - po_balance
        """
        rule_results: list[dict[str, Any]] = []

        # R-001: Valid PDF
        file_val = context.get("file_validation", {})
        if file_val.get("valid", True):
            rule_results.append({
                "rule_id": "R-001",
                "rule_name": "Valid PDF Document",
                "status": RuleStatus.PASS.value,
                "severity": RuleSeverity.BLOCK.value,
                "actual_value": f"Valid PDF with {file_val.get('page_count', 1)} page(s)",
                "expected_value": "Readable PDF under limits",
                "message": "File format, signature, and size constraints verified.",
            })
        else:
            rule_results.append({
                "rule_id": "R-001",
                "rule_name": "Valid PDF Document",
                "status": RuleStatus.FAIL.value,
                "severity": RuleSeverity.BLOCK.value,
                "actual_value": file_val.get("error", "Invalid file"),
                "expected_value": "Readable PDF under limits",
                "message": file_val.get("error", "File could not be opened as a readable PDF."),
            })

        # R-002: Exact File Duplicate
        exact_dup = context.get("exact_duplicate", {})
        if exact_dup.get("is_duplicate"):
            rule_results.append({
                "rule_id": "R-002",
                "rule_name": "Exact-File Duplicate Check",
                "status": RuleStatus.FAIL.value,
                "severity": RuleSeverity.BLOCK.value,
                "actual_value": str(exact_dup.get("existing_run_id")),
                "expected_value": "Unique file SHA-256",
                "message": exact_dup.get("message", "Exact duplicate PDF submitted previously."),
            })
        else:
            rule_results.append({
                "rule_id": "R-002",
                "rule_name": "Exact-File Duplicate Check",
                "status": RuleStatus.PASS.value,
                "severity": RuleSeverity.BLOCK.value,
                "actual_value": "Unique SHA-256",
                "expected_value": "Unique file SHA-256",
                "message": "No previously processed file with matching hash found.",
            })

        # Parse extraction data
        ext = context.get("extraction")
        ext_dict = ext.model_dump() if isinstance(ext, InvoiceExtractionResult) else (ext or {})
        inv_data = ext_dict.get("invoice", {})
        vendor_data = ext_dict.get("vendor", {})
        amounts_data = ext_dict.get("amounts", {})
        meta_data = ext_dict.get("extraction", {})
        evidence_data = ext_dict.get("evidence", {})

        # R-003: Document Type Check
        doc_type = (meta_data.get("document_type") or "invoice").lower()
        if doc_type == "invoice":
            rule_results.append({
                "rule_id": "R-003",
                "rule_name": "Invoice Document Type",
                "status": RuleStatus.PASS.value,
                "severity": RuleSeverity.REVIEW.value,
                "actual_value": doc_type,
                "expected_value": "invoice",
                "message": "Document identified as a vendor invoice.",
            })
        else:
            rule_results.append({
                "rule_id": "R-003",
                "rule_name": "Invoice Document Type",
                "status": RuleStatus.FAIL.value,
                "severity": RuleSeverity.REVIEW.value,
                "actual_value": doc_type,
                "expected_value": "invoice",
                "message": f"Document classified as '{doc_type}', not a standard commercial invoice.",
            })

        # R-004: Required Fields Present
        missing_fields = []
        if not (vendor_data.get("name") or vendor_data.get("tax_id")):
            missing_fields.append("Vendor Name / Tax ID")
        if not inv_data.get("number"):
            missing_fields.append("Invoice Number")
        if not inv_data.get("date"):
            missing_fields.append("Invoice Date")
        if not inv_data.get("currency"):
            missing_fields.append("Currency")
        if not amounts_data.get("grand_total"):
            missing_fields.append("Grand Total")

        if not missing_fields:
            rule_results.append({
                "rule_id": "R-004",
                "rule_name": "Required Fields Extraction",
                "status": RuleStatus.PASS.value,
                "severity": RuleSeverity.REVIEW.value,
                "actual_value": "All critical fields present",
                "expected_value": "Vendor, number, date, currency, total",
                "message": "All required financial and identification fields successfully extracted.",
            })
        else:
            rule_results.append({
                "rule_id": "R-004",
                "rule_name": "Required Fields Extraction",
                "status": RuleStatus.FAIL.value,
                "severity": RuleSeverity.REVIEW.value,
                "actual_value": f"Missing: {', '.join(missing_fields)}",
                "expected_value": "All critical fields non-empty",
                "message": f"Critical invoice fields could not be extracted: {', '.join(missing_fields)}.",
            })

        # R-005: Evidence Quality
        has_number_ev = bool(evidence_data.get("invoice_number", {}).get("raw_text") if evidence_data.get("invoice_number") else False)
        has_total_ev = bool(evidence_data.get("grand_total", {}).get("raw_text") if evidence_data.get("grand_total") else False)
        if has_number_ev and has_total_ev:
            rule_results.append({
                "rule_id": "R-005",
                "rule_name": "Extraction Evidence Quality",
                "status": RuleStatus.PASS.value,
                "severity": RuleSeverity.REVIEW.value,
                "actual_value": "Verified snippets with page references",
                "expected_value": "Usable source evidence quotes",
                "message": "Extracted key fields are supported by source document snippets.",
            })
        else:
            rule_results.append({
                "rule_id": "R-005",
                "rule_name": "Extraction Evidence Quality",
                "status": RuleStatus.WARNING.value,
                "severity": RuleSeverity.INFO.value,
                "actual_value": "Partial / unverified source quotes",
                "expected_value": "Exact snippet quotes",
                "message": "One or more critical fields lack explicit source quote references.",
            })

        # R-006: Vendor Exists
        vendor_match = context.get("vendor_match", {})
        if vendor_match.get("matched") and vendor_match.get("vendor"):
            matched_v = vendor_match["vendor"]
            rule_results.append({
                "rule_id": "R-006",
                "rule_name": "Vendor Identity Resolution",
                "status": RuleStatus.PASS.value,
                "severity": RuleSeverity.REVIEW.value,
                "actual_value": f"{matched_v.legal_name} ({matched_v.vendor_code})",
                "expected_value": "Single matched vendor master record",
                "message": vendor_match.get("message", "Vendor identified in master data."),
            })

            # R-007: Vendor Is Approved
            v_status = (matched_v.status or "UNAPPROVED").upper()
            if v_status == "APPROVED":
                rule_results.append({
                    "rule_id": "R-007",
                    "rule_name": "Vendor Status Approval",
                    "status": RuleStatus.PASS.value,
                    "severity": RuleSeverity.BLOCK.value,
                    "actual_value": "APPROVED",
                    "expected_value": "APPROVED",
                    "message": f"Vendor {matched_v.vendor_code} is active and approved for payments.",
                })
            else:
                rule_results.append({
                    "rule_id": "R-007",
                    "rule_name": "Vendor Status Approval",
                    "status": RuleStatus.FAIL.value,
                    "severity": RuleSeverity.BLOCK.value,
                    "actual_value": v_status,
                    "expected_value": "APPROVED",
                    "message": f"Vendor {matched_v.vendor_code} has status '{v_status}' and cannot proceed.",
                })

            # R-008: Vendor Tax ID Consistency
            tax_match = vendor_match.get("tax_id_matches_master")
            if tax_match is False:
                rule_results.append({
                    "rule_id": "R-008",
                    "rule_name": "Vendor Tax Identifier Consistency",
                    "status": RuleStatus.FAIL.value,
                    "severity": RuleSeverity.REVIEW.value,
                    "actual_value": vendor_data.get("tax_id"),
                    "expected_value": matched_v.tax_id,
                    "message": f"Invoice tax ID '{vendor_data.get('tax_id')}' conflicts with vendor master tax ID '{matched_v.tax_id}'.",
                })
            else:
                rule_results.append({
                    "rule_id": "R-008",
                    "rule_name": "Vendor Tax Identifier Consistency",
                    "status": RuleStatus.PASS.value,
                    "severity": RuleSeverity.REVIEW.value,
                    "actual_value": vendor_data.get("tax_id") or "Not provided on invoice",
                    "expected_value": "Matching tax ID or absent",
                    "message": "Tax registration number is consistent with vendor master.",
                })

        else:
            rule_results.append({
                "rule_id": "R-006",
                "rule_name": "Vendor Identity Resolution",
                "status": RuleStatus.FAIL.value,
                "severity": RuleSeverity.REVIEW.value,
                "actual_value": vendor_data.get("name") or "Unknown",
                "expected_value": "Recognised approved vendor record",
                "message": vendor_match.get("message", "Vendor could not be identified in vendor master."),
            })

        # PO Matching Rules
        po_match = context.get("po_match", {})
        matched_po = po_match.get("po")

        if po_match.get("matched") and matched_po:
            match_type = po_match.get("match_type")
            if match_type == "exact":
                rule_results.append({
                    "rule_id": "R-009",
                    "rule_name": "Purchase Order Reference",
                    "status": RuleStatus.PASS.value,
                    "severity": RuleSeverity.REVIEW.value,
                    "actual_value": matched_po.po_number,
                    "expected_value": "Valid open PO",
                    "message": f"Exact PO reference {matched_po.po_number} validated.",
                })
            else:
                # Candidate matching (Decision D-005: candidate suggestions always trigger review)
                rule_results.append({
                    "rule_id": "R-009",
                    "rule_name": "Purchase Order Reference",
                    "status": RuleStatus.FAIL.value,
                    "severity": RuleSeverity.REVIEW.value,
                    "actual_value": f"Suggested: {matched_po.po_number}",
                    "expected_value": "Explicit confirmed PO number",
                    "message": "No PO number on invoice. Suggested candidate requires human confirmation.",
                })

            # R-010: PO Vendor Match
            if po_match.get("vendor_matches"):
                rule_results.append({
                    "rule_id": "R-010",
                    "rule_name": "PO Vendor Ownership",
                    "status": RuleStatus.PASS.value,
                    "severity": RuleSeverity.BLOCK.value,
                    "actual_value": "Matches matched vendor",
                    "expected_value": "PO belongs to invoice vendor",
                    "message": f"PO {matched_po.po_number} confirmed to belong to the billed vendor.",
                })
            else:
                rule_results.append({
                    "rule_id": "R-010",
                    "rule_name": "PO Vendor Ownership",
                    "status": RuleStatus.FAIL.value,
                    "severity": RuleSeverity.BLOCK.value,
                    "actual_value": "Belongs to a different vendor",
                    "expected_value": "PO belongs to invoice vendor",
                    "message": f"PO {matched_po.po_number} does not belong to the identified vendor.",
                })

            # R-011: PO Currency Match
            if po_match.get("currency_matches"):
                rule_results.append({
                    "rule_id": "R-011",
                    "rule_name": "PO Currency Compatibility",
                    "status": RuleStatus.PASS.value,
                    "severity": RuleSeverity.REVIEW.value,
                    "actual_value": inv_data.get("currency") or "INR",
                    "expected_value": matched_po.currency,
                    "message": f"Currency matches PO currency ({matched_po.currency}).",
                })
            else:
                rule_results.append({
                    "rule_id": "R-011",
                    "rule_name": "PO Currency Compatibility",
                    "status": RuleStatus.FAIL.value,
                    "severity": RuleSeverity.REVIEW.value,
                    "actual_value": inv_data.get("currency"),
                    "expected_value": matched_po.currency,
                    "message": f"Invoice currency '{inv_data.get('currency')}' differs from PO currency '{matched_po.currency}'.",
                })

            # R-016: PO Status
            po_status = (matched_po.status or "OPEN").upper()
            if po_status in ("OPEN", "PARTIALLY_INVOICED"):
                rule_results.append({
                    "rule_id": "R-016",
                    "rule_name": "PO Lifecycle Status",
                    "status": RuleStatus.PASS.value,
                    "severity": RuleSeverity.BLOCK.value,
                    "actual_value": po_status,
                    "expected_value": "OPEN or PARTIALLY_INVOICED",
                    "message": f"PO {matched_po.po_number} is open for invoicing.",
                })
            elif po_status == "CANCELLED":
                rule_results.append({
                    "rule_id": "R-016",
                    "rule_name": "PO Lifecycle Status",
                    "status": RuleStatus.FAIL.value,
                    "severity": RuleSeverity.BLOCK.value,
                    "actual_value": "CANCELLED",
                    "expected_value": "OPEN or PARTIALLY_INVOICED",
                    "message": f"PO {matched_po.po_number} is CANCELLED. Invoices cannot be processed against it.",
                })
            else:
                rule_results.append({
                    "rule_id": "R-016",
                    "rule_name": "PO Lifecycle Status",
                    "status": RuleStatus.FAIL.value,
                    "severity": RuleSeverity.REVIEW.value,
                    "actual_value": po_status,
                    "expected_value": "OPEN or PARTIALLY_INVOICED",
                    "message": f"PO {matched_po.po_number} is CLOSED. Review required before additional billing.",
                })

        else:
            rule_results.append({
                "rule_id": "R-009",
                "rule_name": "Purchase Order Reference",
                "status": RuleStatus.FAIL.value,
                "severity": RuleSeverity.REVIEW.value,
                "actual_value": inv_data.get("po_number") or "Missing",
                "expected_value": "Valid open PO record",
                "message": po_match.get("message", "No valid purchase order found or matched."),
            })

        # R-012: Business-Key Duplicate Check
        biz_dup = context.get("business_duplicate", {})
        tier = biz_dup.get("tier")
        if tier == "business_key":
            rule_results.append({
                "rule_id": "R-012",
                "rule_name": "Business Duplicate Detection",
                "status": RuleStatus.FAIL.value,
                "severity": RuleSeverity.BLOCK.value,
                "actual_value": f"Duplicate of Run {biz_dup.get('existing_run_id')}",
                "expected_value": "Unique invoice number per vendor",
                "message": biz_dup.get("message", "An invoice with this number already exists for this vendor."),
            })
        elif tier == "possible":
            rule_results.append({
                "rule_id": "R-012",
                "rule_name": "Business Duplicate Detection",
                "status": RuleStatus.FAIL.value,
                "severity": RuleSeverity.REVIEW.value,
                "actual_value": f"Possible match: Run {biz_dup.get('existing_run_id')}",
                "expected_value": "Distinct transaction",
                "message": biz_dup.get("message", "Possible duplicate transaction detected. Review required."),
            })
        else:
            rule_results.append({
                "rule_id": "R-012",
                "rule_name": "Business Duplicate Detection",
                "status": RuleStatus.PASS.value,
                "severity": RuleSeverity.BLOCK.value,
                "actual_value": "Unique vendor + invoice number",
                "expected_value": "No duplicate record",
                "message": "No duplicate invoice recorded for this vendor.",
            })

        # R-013: Invoice Arithmetic
        arith = context.get("arithmetic_reconciliation", {})
        if arith.get("passes"):
            rule_results.append({
                "rule_id": "R-013",
                "rule_name": "Invoice Arithmetic Reconciliation",
                "status": RuleStatus.PASS.value,
                "severity": RuleSeverity.REVIEW.value,
                "actual_value": f"Calculated: INR {arith.get('calculated_total')}, Declared: INR {arith.get('declared_total')}",
                "expected_value": "Variance within rounding allowance (INR 1.00)",
                "message": arith.get("message", "Invoice arithmetic reconciles."),
            })
        else:
            rule_results.append({
                "rule_id": "R-013",
                "rule_name": "Invoice Arithmetic Reconciliation",
                "status": RuleStatus.FAIL.value,
                "severity": RuleSeverity.REVIEW.value,
                "actual_value": f"Declared INR {arith.get('declared_total')} != Calculated INR {arith.get('calculated_total')} (Variance INR {arith.get('variance')})",
                "expected_value": "Declared total == Subtotal + Tax + Shipping - Discount",
                "message": arith.get("message", "Invoice arithmetic discrepancy exceeds allowance."),
            })

        # R-014: Line Item Arithmetic
        lines = context.get("line_item_reconciliation", [])
        line_fails = [l for l in lines if not l.get("passes")]
        if not line_fails:
            rule_results.append({
                "rule_id": "R-014",
                "rule_name": "Line Item Multiplication",
                "status": RuleStatus.PASS.value,
                "severity": RuleSeverity.REVIEW.value,
                "actual_value": f"{len(lines)} line item(s) checked",
                "expected_value": "Qty * Price == Line Total",
                "message": "All itemised line totals reconcile.",
            })
        else:
            rule_results.append({
                "rule_id": "R-014",
                "rule_name": "Line Item Multiplication",
                "status": RuleStatus.FAIL.value,
                "severity": RuleSeverity.REVIEW.value,
                "actual_value": f"{len(line_fails)} line discrepancies",
                "expected_value": "Qty * Price == Line Total",
                "message": f"Discrepancies found on {len(line_fails)} line item(s).",
            })

        # R-015: PO Balance and Tolerance
        po_bal = context.get("po_balance", {})
        if po_bal:
            if po_bal.get("passes"):
                status_val = RuleStatus.WARNING.value if po_bal.get("tolerance_warning") else RuleStatus.PASS.value
                rule_results.append({
                    "rule_id": "R-015",
                    "rule_name": "PO Balance & Tolerance Check",
                    "status": status_val,
                    "severity": RuleSeverity.REVIEW.value,
                    "actual_value": f"Invoice: INR {po_bal.get('invoice_total')}, Remaining before: INR {po_bal.get('remaining_before')}",
                    "expected_value": f"Within remaining balance or allowed tolerance (INR {po_bal.get('allowed_variance')})",
                    "message": po_bal.get("message", "PO balance sufficient."),
                })
            else:
                rule_results.append({
                    "rule_id": "R-015",
                    "rule_name": "PO Balance & Tolerance Check",
                    "status": RuleStatus.FAIL.value,
                    "severity": RuleSeverity.REVIEW.value,
                    "actual_value": f"Invoice INR {po_bal.get('invoice_total')} exceeds balance INR {po_bal.get('remaining_before')}",
                    "expected_value": f"Within allowed variance INR {po_bal.get('allowed_variance')}",
                    "message": po_bal.get("message", "Invoice exceeds available PO balance."),
                })

        # -------------------------------------------------------------
        # Determine Top-Level Decision Status in Priority Order
        # -------------------------------------------------------------
        block_failures = [r for r in rule_results if r["status"] == RuleStatus.FAIL.value and r["severity"] == RuleSeverity.BLOCK.value]
        review_failures = [r for r in rule_results if r["status"] == RuleStatus.FAIL.value and r["severity"] == RuleSeverity.REVIEW.value]

        if block_failures:
            status = DecisionStatus.BLOCKED
            reasons = [r["rule_id"] for r in block_failures]
            summary = f"Run blocked due to policy violations: {block_failures[0]['message']}"
            recommended_action = "Reject invoice or contact vendor. This invoice cannot be processed automatically."
        elif review_failures:
            status = DecisionStatus.REVIEW_REQUIRED
            reasons = [r["rule_id"] for r in review_failures]
            summary = f"Discrepancy or uncertainty detected: {review_failures[0]['message']}"
            recommended_action = "Review discrepancy in the AP console, verify source evidence, and record resolution."
        else:
            status = DecisionStatus.READY_FOR_AP_APPROVAL
            reasons = []
            summary = "All required checks passed. The invoice is validated and ready for Accounts Payable approval."
            recommended_action = "Proceed with final AP sign-off."

        return {
            "status": status.value,
            "rule_results": rule_results,
            "reason_codes": reasons,
            "summary": summary,
            "recommended_action": recommended_action,
        }
