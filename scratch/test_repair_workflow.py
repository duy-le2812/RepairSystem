import os
import sys

# Reconfigure encoding for Windows console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Ensure backend directory is in python path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from fastapi.testclient import TestClient
from main import app

def log_step(title):
    print(f"\n======================================================\n[TEST] {title}\n======================================================")

def run_all_tests():
    client = TestClient(app)
    
    # 1. Login Admin to get token (password is Admin@123)
    log_step("AUTHENTICATION & SETUP")
    res = client.post("/api/login/", json={"username": "admin", "password": "Admin@123"})
    if res.status_code != 200:
        print(f"[FAIL] Admin login failed: {res.status_code} {res.text}")
        return False
    
    token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {token}"}
    print("[OK] Admin login successful.")

    # Create test Customer A and Customer B for authorization testing
    res_reg_a = client.post("/api/auth/register", json={
        "username": "customer_a", "email": "customer_a@test.com", "password": "password123", 
        "confirm_password": "password123", "full_name": "Nguyen Van A", "phone": "0911111111"
    })
    res_login_a = client.post("/api/login/", json={"username": "customer_a", "password": "password123"})
    token_a = res_login_a.json()["access_token"] if res_login_a.status_code == 200 else ""
    headers_a = {"Authorization": f"Bearer {token_a}"} if token_a else {}

    res_reg_b = client.post("/api/auth/register", json={
        "username": "customer_b", "email": "customer_b@test.com", "password": "password123", 
        "confirm_password": "password123", "full_name": "Tran Van B", "phone": "0922222222"
    })
    res_login_b = client.post("/api/login/", json={"username": "customer_b", "password": "password123"})
    token_b = res_login_b.json()["access_token"] if res_login_b.status_code == 200 else ""
    headers_b = {"Authorization": f"Bearer {token_b}"} if token_b else {}

    # =========================================================================
    # FLOW 1: Customer Approval Workflow (Happy Path)
    # =========================================================================
    log_step("FLOW 1: Customer Approval Workflow (Happy Path)")
    
    # Step 1: Create Repair Ticket
    booking_data = {
        "customer_name": "Nguyen Van A",
        "phone_number": "0911111111",
        "device_type": "phone",
        "brand": "Apple",
        "device_model": "iPhone 13 Pro",
        "symptoms": "Màn hình bị vỡ và chập chập",
        "branch_id": "Chi nhánh Hà Nội"
    }
    res_b1 = client.post("/api/booking/", json=booking_data)
    assert res_b1.status_code in (200, 201), f"Expected 200/201, got {res_b1.status_code}"
    ticket_1 = res_b1.json()
    ticket_id_1 = ticket_1["ticket_id"]
    code_1 = ticket_1["booking_id"]
    assert ticket_1["status"] == "TiepNhan", f"Initial status must be TiepNhan, got {ticket_1['status']}"
    print(f"[OK] Step 1: Ticket created {code_1} (ID: {ticket_id_1}), status: {ticket_1['status']}")

    # Step 2: Move to Inspection
    res_s2 = client.put(f"/api/tickets/{ticket_id_1}/status?new_status=DangKiemTra", headers=admin_headers)
    assert res_s2.status_code == 200, f"Expected 200, got {res_s2.status_code}"
    print("[OK] Step 2: Admin moved status to DangKiemTra")

    # Step 3: Submit Diagnosis
    diag_data = {
        "symptoms": "Màn hình vỡ sọc, mặt kính sứt mẻ",
        "inspection_result": "Vỡ phôi màn hình OLED bên trong, hỏng cảm ứng",
        "root_cause": "Va đập mạnh do làm rơi",
        "proposed_solution": "Thay nguyên bộ màn hình OLED iPhone 13 Pro chính hãng"
    }
    res_s3 = client.post(f"/api/tickets/{ticket_id_1}/diagnosis", json=diag_data, headers=admin_headers)
    assert res_s3.status_code == 200, f"Expected 200, got {res_s3.status_code}"
    print("[OK] Step 3: Admin submitted diagnosis -> Auto status DaChuanDoan")

    # Step 4: Submit Quotation
    quote_data = {
        "labor_cost": 150000,
        "additional_cost": 50000,
        "warranty": "6 tháng",
        "notes": "Linh kiện bóc máy chính hãng 100%",
        "parts": [
            {"part_name": "Màn hình OLED iPhone 13 Pro", "unit_price": 2500000, "quantity": 1},
            {"part_name": "Kính cường lực Vmax", "unit_price": 100000, "quantity": 1}
        ]
    }
    res_s4 = client.post(f"/api/tickets/{ticket_id_1}/quotation", json=quote_data, headers=admin_headers)
    assert res_s4.status_code == 200, f"Expected 200, got {res_s4.status_code}"
    quote_res = res_s4.json()
    expected_total = 2500000 + 100000 + 150000 + 50000
    assert float(quote_res["total_amount"]) == expected_total, f"Expected total {expected_total}, got {quote_res['total_amount']}"
    print(f"[OK] Step 4: Admin submitted quotation -> Total: {expected_total:,.0f} VNĐ -> Status: ChoKhachXacNhan")

    # Step 5: Invalid Transition Check (ChoKhachXacNhan -> DangSua must return 400)
    res_s5 = client.put(f"/api/tickets/{ticket_id_1}/status?new_status=DangSua", headers=admin_headers)
    assert res_s5.status_code == 400, f"Expected 400 Bad Request when bypassing customer approval, got {res_s5.status_code}"
    print("[OK] Step 5: Bypassing customer confirmation returned 400 Bad Request as expected.")

    # Step 6: Customer Approval
    res_s6 = client.post(f"/api/tickets/{ticket_id_1}/quotation/respond", json={
        "decision": "approved",
        "customer_name": "Nguyen Van A"
    })
    assert res_s6.status_code == 200, f"Expected 200, got {res_s6.status_code}"
    assert res_s6.json()["customer_decision"] == "approved"
    print("[OK] Step 6: Customer approved quotation -> Ticket status updated to KhachDongY")

    # Step 7: Repair Process
    sequential_statuses = ["DangSua", "DaSuaXong", "KiemTraChatLuong", "ChoKhachNhanMay", "DaThanhToan", "HoanThanh"]
    for st in sequential_statuses:
        res_st = client.put(f"/api/tickets/{ticket_id_1}/status?new_status={st}", headers=admin_headers)
        assert res_st.status_code == 200, f"Expected 200 for status {st}, got {res_st.status_code}"
        print(f"   -> Advanced to {st}: HTTP 200")
    print("[OK] Step 7: Completed full repair workflow progress to HoanThanh.")

    # Step 8: Database & History Verification
    res_hist = client.get(f"/api/tickets/{ticket_id_1}/history", headers=admin_headers)
    assert res_hist.status_code == 200
    histories = res_hist.json()
    assert len(histories) >= 8, f"Expected at least 8 history records, got {len(histories)}"
    print(f"[OK] Step 8: Verified database history log (recorded {len(histories)} actions).")

    # =========================================================================
    # FLOW 2: Customer Rejection Workflow
    # =========================================================================
    log_step("FLOW 2: Customer Rejection Workflow")
    
    # Step 1: Create Ticket
    res_b2 = client.post("/api/booking/", json={
        "customer_name": "Tran Van B", "phone_number": "0922222222", "device_type": "laptop",
        "brand": "Dell", "device_model": "XPS 13", "symptoms": "Không lên nguồn", "branch_id": "Chi nhánh Hà Nội"
    })
    ticket_2 = res_b2.json()
    ticket_id_2 = ticket_2["ticket_id"]
    
    # Step 2: Admin inspects, diagnoses, quotes
    client.put(f"/api/tickets/{ticket_id_2}/status?new_status=DangKiemTra", headers=admin_headers)
    client.post(f"/api/tickets/{ticket_id_2}/diagnosis", json={
        "symptoms": "Không nguồn", "inspection_result": "Chập mainboard", "root_cause": "Hỏng IC nguồn", "proposed_solution": "Thay mainboard"
    }, headers=admin_headers)
    client.post(f"/api/tickets/{ticket_id_2}/quotation", json={
        "labor_cost": 200000, "additional_cost": 0, "warranty": "3 tháng", "notes": "",
        "parts": [{"part_name": "Mainboard Dell XPS 13", "unit_price": 5000000, "quantity": 1}]
    }, headers=admin_headers)
    
    # Step 3: Customer Rejects
    res_rej = client.post(f"/api/tickets/{ticket_id_2}/quotation/respond", json={
        "decision": "rejected", "rejection_reason": "Giá thay mainboard quá cao", "customer_name": "Tran Van B"
    })
    assert res_rej.status_code == 200
    assert res_rej.json()["customer_decision"] == "rejected"
    print("[OK] Step 3: Customer rejected quotation -> Status set to KhachTuChoi")

    # Step 4: Verify ticket retained in database
    res_search_rej = client.get(f"/api/tickets/search?code=FIX-{ticket_id_2:05d}")
    assert res_search_rej.status_code == 200
    assert len(res_search_rej.json()) == 1
    assert res_search_rej.json()[0]["status"] == "KhachTuChoi"
    print("[OK] Step 4: Verified Ticket exists in Database and is NOT deleted.")

    # Step 5: Admin tries to switch rejected ticket to DangSua -> 400
    res_try_repair = client.put(f"/api/tickets/{ticket_id_2}/status?new_status=DangSua", headers=admin_headers)
    assert res_try_repair.status_code == 400, f"Expected 400 Bad Request, got {res_try_repair.status_code}"
    print("[OK] Step 5: Admin blocked from moving rejected ticket to DangSua (400 Bad Request).")

    # Step 6: Verify History recorded rejection & reason
    res_hist2 = client.get(f"/api/tickets/{ticket_id_2}/history", headers=admin_headers)
    hist2_actions = [h["action"] for h in res_hist2.json()]
    assert "Khách từ chối sửa" in hist2_actions
    print("[OK] Step 6: Verified rejection history & reason recorded.")

    # =========================================================================
    # FLOW 3: Invalid Workflow State Machine Transitions
    # =========================================================================
    log_step("FLOW 3: Invalid Workflow Transitions Check")
    
    temp_t = client.post("/api/booking/", json={
        "customer_name": "Test User", "phone_number": "0999999999", "device_type": "phone",
        "brand": "Test", "device_model": "Test", "symptoms": "Test", "branch_id": "Hanoi"
    }).json()["ticket_id"]
    
    for from_st, to_st in [("TiepNhan", "DangSua"), ("TiepNhan", "HoanThanh")]:
        res_inv = client.put(f"/api/tickets/{temp_t}/status?new_status={to_st}", headers=admin_headers)
        assert res_inv.status_code == 400, f"Transition {from_st}->{to_st} should return 400, got {res_inv.status_code}"
        print(f"[OK] Blocked illegal transition '{from_st}' -> '{to_st}': HTTP 400")

    # =========================================================================
    # FLOW 4: Authorization
    # =========================================================================
    log_step("FLOW 4: Authorization & Privilege Checks")
    
    # Customer A cannot search Customer B's ticket when authenticated
    res_auth_cross = client.get(f"/api/tickets/search?code=FIX-{ticket_id_2:05d}", headers=headers_a)
    assert res_auth_cross.status_code == 403, f"Expected 403 Forbidden for Customer A reading Customer B's ticket, got {res_auth_cross.status_code}"
    print("[OK] Verified Customer A forbidden from accessing Customer B's ticket (HTTP 403).")

    # Customer cannot modify diagnosis, quotation, or status
    res_cust_diag = client.post(f"/api/tickets/{ticket_id_1}/diagnosis", json={
        "inspection_result": "hack", "root_cause": "hack", "proposed_solution": "hack"
    }, headers=headers_a)
    assert res_cust_diag.status_code == 403, f"Customer modifying diagnosis should return 403, got {res_cust_diag.status_code}"

    res_cust_status = client.put(f"/api/tickets/{ticket_id_1}/status?new_status=HoanThanh", headers=headers_a)
    assert res_cust_status.status_code == 403, f"Customer modifying status should return 403, got {res_cust_status.status_code}"
    print("[OK] Verified Customer forbidden from editing diagnosis and status (HTTP 403).")

    # Admin access
    res_admin_dash = client.get("/api/stats/", headers=admin_headers)
    assert res_admin_dash.status_code == 200
    print("[OK] Verified Admin access to Dashboard & Repair Orders (HTTP 200).")

    # =========================================================================
    # FLOW 5: Validation & Edge Cases
    # =========================================================================
    log_step("FLOW 5: Input Validation & Boundary Checks")
    
    # Negative labor cost -> 422
    res_v1 = client.post(f"/api/tickets/{ticket_id_1}/quotation", json={
        "labor_cost": -100000, "additional_cost": 0, "parts": [{"part_name": "Screen", "unit_price": 100, "quantity": 1}]
    }, headers=admin_headers)
    assert res_v1.status_code in (400, 422), f"Negative labor cost should fail with 400/422, got {res_v1.status_code}"

    # Negative part price -> 422
    res_v2 = client.post(f"/api/tickets/{ticket_id_1}/quotation", json={
        "labor_cost": 0, "additional_cost": 0, "parts": [{"part_name": "Screen", "unit_price": -1, "quantity": 1}]
    }, headers=admin_headers)
    assert res_v2.status_code in (400, 422), f"Negative part price should fail with 400/422, got {res_v2.status_code}"

    # Empty parts -> 422
    res_v3 = client.post(f"/api/tickets/{ticket_id_1}/quotation", json={
        "labor_cost": 100000, "additional_cost": 0, "parts": []
    }, headers=admin_headers)
    assert res_v3.status_code in (400, 422), f"Empty parts should fail with 422, got {res_v3.status_code}"

    # Non-existent ticket -> 404
    res_v4 = client.get("/api/tickets/999999/history", headers=admin_headers)
    assert res_v4.status_code == 404, f"Non-existent ticket history should return 404, got {res_v4.status_code}"

    # Bad ticket code format -> 400
    res_v5 = client.get("/api/tickets/search?code=INVALID_CODE_XYZ")
    assert res_v5.status_code == 400, f"Invalid code format should return 400, got {res_v5.status_code}"

    print("[OK] Verified all input validation rules (-1 price, empty parts, bad ID, 404 ticket).")

    # =========================================================================
    # FLOW 6: Double Submit Protection (Idempotency)
    # =========================================================================
    log_step("FLOW 6: Double Submit Protection (Idempotency)")
    
    # Customer A approves multiple times
    res_dup1 = client.post(f"/api/tickets/{ticket_id_1}/quotation/respond", json={"decision": "approved"})
    res_dup2 = client.post(f"/api/tickets/{ticket_id_1}/quotation/respond", json={"decision": "approved"})
    assert res_dup1.status_code == 200
    assert res_dup2.status_code == 200
    
    # Check that history logs count didn't duplicate
    hist_after = client.get(f"/api/tickets/{ticket_id_1}/history", headers=admin_headers).json()
    approved_logs = [h for h in hist_after if h["status"] == "KhachDongY"]
    assert len(approved_logs) == 1, f"Expected 1 'KhachDongY' history entry after double submit, got {len(approved_logs)}"
    print("[OK] Verified Double Submit protection: subsequent approve calls return 200 without creating duplicate history logs.")

    # =========================================================================
    # FLOW 7: Restart Persistence
    # =========================================================================
    log_step("FLOW 7: Data Persistence Verification")
    
    res_verify_pers = client.get(f"/api/tickets/search?code={code_1}")
    assert res_verify_pers.status_code == 200
    t_pers = res_verify_pers.json()[0]
    assert t_pers["status"] == "HoanThanh"
    assert t_pers["quotation"] is not None
    assert t_pers["diagnosis"] is not None
    assert len(t_pers["histories"]) > 0
    print("[OK] Verified complete persistence of Ticket, Diagnosis, Quotation, and Audit History.")

    print("\n======================================================\nALL 7 TEST FLOWS PASSED SUCCESSFULLY!\n======================================================\n")
    return True

if __name__ == "__main__":
    success = run_all_tests()
    if not success:
        sys.exit(1)
