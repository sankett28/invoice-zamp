import httpx
import time
import sys

API_BASE = "http://127.0.0.1:8000"

def upload_invoice(file_path):
    with open(file_path, "rb") as f:
        fname = file_path.split("/")[-1].split("\\")[-1]
        r = httpx.post(f"{API_BASE}/api/invoices/", files={"file": (fname, f, "application/pdf")}, timeout=30.0)
        r.raise_for_status()
        return r.json()["run_id"]

def wait_for_run(run_id, max_attempts=15):
    for i in range(max_attempts):
        time.sleep(1)
        r = httpx.get(f"{API_BASE}/api/runs/{run_id}", timeout=10.0)
        r.raise_for_status()
        data = r.json()
        if data.get("processing_state") in ["COMPLETED", "FAILED"]:
            return data
    return data

def run_tests():
    print("=== STARTING LEDGERFLOW FULL SCENARIO VERIFICATION ===\n")
    results = {}

    # 1. Happy Path
    print("1. Testing Happy Path (invoice_happy_path.pdf)...")
    rid = upload_invoice("e:/invoice-zamp/sample_data/invoices/invoice_happy_path.pdf")
    data = wait_for_run(rid)
    dec = data.get("decision_status")
    print(f"   -> Decision: {dec}")
    assert dec == "READY_FOR_AP_APPROVAL", f"Expected READY_FOR_AP_APPROVAL, got {dec}"
    results["Happy Path"] = "PASS"

    # 2. EC-1: Exact Duplicate
    print("\n2. Testing EC-1: Exact SHA-256 Duplicate...")
    rid_exact = upload_invoice("e:/invoice-zamp/sample_data/invoices/invoice_happy_path.pdf")
    data_exact = wait_for_run(rid_exact)
    dec = data_exact.get("decision_status")
    print(f"   -> Decision: {dec} | Summary: {data_exact.get('decision_summary')}")
    assert dec == "BLOCKED", f"Expected BLOCKED, got {dec}"
    assert "Exact file duplicate" in data_exact.get("decision_summary", "")
    results["EC-1 Exact Duplicate"] = "PASS"

    # 3. EC-1: Reformatted Business Duplicate
    print("\n3. Testing EC-1: Reformatted Business Duplicate...")
    rid_biz = upload_invoice("e:/invoice-zamp/sample_data/invoices/invoice_duplicate_reformatted.pdf")
    data_biz = wait_for_run(rid_biz)
    dec = data_biz.get("decision_status")
    print(f"   -> Decision: {dec} | Reasons: {data_biz.get('decision', {}).get('reason_codes')}")
    assert dec == "BLOCKED", f"Expected BLOCKED, got {dec}"
    assert "R-012" in data_biz.get("decision", {}).get("reason_codes", [])
    results["EC-1 Business Duplicate"] = "PASS"

    # 4. EC-2: Split PO Invoices
    print("\n4. Testing EC-2: Split PO Sequence on PO-2001 (Total: 100,000.00)...")
    # Split 1: 40k
    rid_s1 = upload_invoice("e:/invoice-zamp/sample_data/invoices/invoice_split_1.pdf")
    d_s1 = wait_for_run(rid_s1)
    print(f"   -> Split 1 (40,000 INR): Decision = {d_s1.get('decision_status')}")
    assert d_s1.get("decision_status") == "READY_FOR_AP_APPROVAL"

    # Split 2: 60k
    rid_s2 = upload_invoice("e:/invoice-zamp/sample_data/invoices/invoice_split_2.pdf")
    d_s2 = wait_for_run(rid_s2)
    print(f"   -> Split 2 (60,000 INR): Decision = {d_s2.get('decision_status')}")
    assert d_s2.get("decision_status") == "READY_FOR_AP_APPROVAL"

    # Split 3: 1k (overbilling)
    rid_s3 = upload_invoice("e:/invoice-zamp/sample_data/invoices/invoice_split_3.pdf")
    d_s3 = wait_for_run(rid_s3)
    print(f"   -> Split 3 (1,000 INR overbilling): Decision = {d_s3.get('decision_status')} | Reasons: {d_s3.get('decision', {}).get('reason_codes')}")
    assert d_s3.get("decision_status") == "REVIEW_REQUIRED"
    assert "R-015" in d_s3.get("decision", {}).get("reason_codes", [])
    results["EC-2 Split PO & Tolerance"] = "PASS"

    # 5. EC-3: Missing PO Reference & Reviewer Resolution
    print("\n5. Testing EC-3: Missing PO Reference & Reviewer Resolution...")
    rid_mpo = upload_invoice("e:/invoice-zamp/sample_data/invoices/invoice_missing_po.pdf")
    d_mpo = wait_for_run(rid_mpo)
    print(f"   -> Initial Decision: {d_mpo.get('decision_status')} | Reasons: {d_mpo.get('decision', {}).get('reason_codes')}")
    assert d_mpo.get("decision_status") == "REVIEW_REQUIRED"
    assert "R-009" in d_mpo.get("decision", {}).get("reason_codes", [])

    # Fetch PO list to find PO-2002
    pos = httpx.get(f"{API_BASE}/api/purchase-orders").json()
    po_2002 = next((p for p in pos if p["po_number"] == "PO-2002"), None)
    assert po_2002 is not None

    # Submit Review action
    rev_payload = {
        "action": "ASSIGN_PO",
        "reviewer_label": "Sanket (AP Lead)",
        "reason": "Verified software maintenance scope with vendor. Assigned to PO-2002.",
        "assigned_po_id": po_2002["id"]
    }
    rev_res = httpx.post(f"{API_BASE}/api/runs/{rid_mpo}/review", json=rev_payload)
    rev_res.raise_for_status()

    # Re-fetch run
    d_mpo_updated = httpx.get(f"{API_BASE}/api/runs/{rid_mpo}").json()
    print(f"   -> After Review Decision: {d_mpo_updated.get('decision_status')}")
    print(f"   -> Assigned PO: {d_mpo_updated.get('purchase_order', {}).get('po_number')}")
    assert d_mpo_updated.get("decision_status") == "READY_FOR_AP_APPROVAL"
    assert d_mpo_updated.get("purchase_order", {}).get("po_number") == "PO-2002"
    results["EC-3 Missing PO & Review"] = "PASS"

    # 6. EC-4: Scanned PDF
    print("\n6. Testing EC-4: Scanned PDF (invoice_low_quality_scan.pdf)...")
    rid_scan = upload_invoice("e:/invoice-zamp/sample_data/invoices/invoice_low_quality_scan.pdf")
    d_scan = wait_for_run(rid_scan)
    ocr_stage = next((s for s in d_scan.get("stages", []) if s["stage_key"] == "ocr_fallback"), None)
    print(f"   -> OCR / Vision Stage Status: {ocr_stage.get('status') if ocr_stage else 'None'}")
    assert ocr_stage is not None and ocr_stage.get("status") in ["COMPLETED", "RUNNING", "NEEDS_ATTENTION"]
    results["EC-4 Scanned PDF OCR"] = "PASS"

    # 7. Vendor / PO Mismatch
    print("\n7. Testing Vendor / PO Mismatch (invoice_vendor_po_mismatch.pdf)...")
    rid_mis = upload_invoice("e:/invoice-zamp/sample_data/invoices/invoice_vendor_po_mismatch.pdf")
    d_mis = wait_for_run(rid_mis)
    print(f"   -> Decision: {d_mis.get('decision_status')} | Reasons: {d_mis.get('decision', {}).get('reason_codes')}")
    assert d_mis.get("decision_status") == "BLOCKED"
    assert "R-010" in d_mis.get("decision", {}).get("reason_codes", [])
    results["Vendor-PO Mismatch"] = "PASS"

    # 8. Invoice Arithmetic Mismatch
    print("\n8. Testing Invoice Arithmetic Mismatch (invoice_total_mismatch.pdf)...")
    rid_tot = upload_invoice("e:/invoice-zamp/sample_data/invoices/invoice_total_mismatch.pdf")
    d_tot = wait_for_run(rid_tot)
    print(f"   -> Decision: {d_tot.get('decision_status')} | Reasons: {d_tot.get('decision', {}).get('reason_codes')}")
    assert d_tot.get("decision_status") == "REVIEW_REQUIRED"
    assert "R-013" in d_tot.get("decision", {}).get("reason_codes", [])
    results["Arithmetic Discrepancy"] = "PASS"

    print("\n======================= SUMMARY =======================")
    for k, v in results.items():
        print(f"  {k:30}: {v}")
    print("=======================================================\n")
    print("ALL SCENARIOS PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    run_tests()
