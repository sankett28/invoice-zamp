# LedgerFlow — Accounts Payable Auditor Standard Operating Procedure (SOP)

**Audience:** Accounts Payable Analysts, Senior AP Reviewers, Financial Controllers  
**Scope:** Reviewing, resolving, and confirming invoices flagged with `REVIEW_REQUIRED` or `BLOCKED`.

---

## 1. Decision Status Definitions

| Status | Meaning | Action Permitted |
| :--- | :--- | :--- |
| **`READY_FOR_AP_APPROVAL`** | All 16 deterministic checks passed. Invoice arithmetic, PO remaining balance, and vendor records match. | One-click release to payment batch. |
| **`REVIEW_REQUIRED`** | Non-blocking exception detected (e.g. missing PO number, borderline tolerance warning, slight arithmetic discrepancy). | Requires human investigation and explicit sign-off. |
| **`BLOCKED`** | High-risk policy violation (e.g. duplicate invoice, inactive vendor, PO owned by different vendor, gross overbilling). | Invoice cannot be paid. Must be rejected or re-issued by vendor. |

---

## 2. Standard Resolution Workflows for Common Exceptions

### Exception 1: Missing Purchase Order Reference (`Rule R-009`)
- **Symptoms:** Invoice status is `REVIEW_REQUIRED`. Rule R-009 is `FAIL`.
- **Root Cause:** Vendor did not print the PO number on the document (or printed `N/A`).
- **Standard Operating Procedure:**
  1. Inspect the **Extracted Invoice** summary for line item descriptions and billed amounts.
  2. Open the **PO Candidate Matching** section in the review panel. LedgerFlow will automatically score and display open POs for this vendor.
  3. Verify against procurement records / email trails to identify the authorized contract.
  4. Select the matching PO from the dropdown in the **Reviewer Action** panel.
  5. Select action **`ASSIGN_PO`**, input reviewer name and mandatory verification reason (e.g., *"Verified with procurement manager; billed under software maintenance scope"*).
  6. Click **Submit Review**. The invoice will transition to `READY_FOR_AP_APPROVAL` and commit against that PO balance.

---

### Exception 2: Borderline Tolerance Overage (`Rule R-015 WARNING`)
- **Symptoms:** Status is `READY_FOR_AP_APPROVAL` or `REVIEW_REQUIRED`, with a tolerance warning banner.
- **Policy Rule:** Invoices exceeding remaining PO balance by $\le \min(1\%, ₹500)$ are permitted under organizational policy.
- **Standard Operating Procedure:**
  1. Verify if the variance is attributable to freight, packaging, or rounding.
  2. If within business tolerance and authorized by budget holder, approve the invoice.
  3. If overage is unauthorized, use the Review Form to select **`RETURN`** with reason: *"Vendor overbilled beyond contract limits by ₹X. Requesting credit note."*

---

### Exception 3: Exact or Business Duplicate Detected (`Rule R-002` or `Rule R-012`)
- **Symptoms:** Status is **`BLOCKED`**.
- **Root Cause:**
  - `R-002`: Identical SHA-256 byte digest as a previously submitted PDF.
  - `R-012`: Identical normalised invoice number from the same vendor.
- **Standard Operating Procedure:**
  1. Click the historical run link provided in the Decision Card.
  2. Confirm whether the prior invoice was already paid or is currently in processing.
  3. Under no circumstances should a duplicate invoice be confirmed. Mark as **`REJECT`** to notify the vendor.

---

### Exception 4: Vendor / PO Ownership Conflict (`Rule R-010`)
- **Symptoms:** Status is **`BLOCKED`**.
- **Root Cause:** PO number belongs to Vendor B, but invoice was issued by Vendor A.
- **Standard Operating Procedure:**
  1. Verify if the vendor underwent a recent acquisition, merger, or legal entity name change.
  2. If legitimate entity change, procurement must update the vendor master record before invoice can be processed.
  3. Otherwise, reject as unauthorized cross-vendor billing.
