import os
import sys

# Reconfigure encoding for Windows console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Ensure backend directory is in python path
backend_path = os.path.abspath(os.path.join(os.path.join(os.path.dirname(__file__), '..', 'backend')))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from fastapi.testclient import TestClient
from main import app

def log_step(title):
    print(f"\n======================================================\n[TEST TASK 31 & 32] {title}\n======================================================")

def run_all_tests():
    client = TestClient(app)
    
    # Setup test users Customer A and Customer B
    log_step("1. SETUP USERS & TICKETS")
    cust_a_user = "task31_cust_a"
    cust_a_pass = "pass123456"
    client.post("/api/auth/register", json={
        "username": cust_a_user, "email": "cust_a@test.com", "password": cust_a_pass,
        "confirm_password": cust_a_pass, "full_name": "Customer A", "phone": "0911000111"
    })
    res_a = client.post("/api/login/", json={"username": cust_a_user, "password": cust_a_pass})
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    cust_b_user = "task31_cust_b"
    cust_b_pass = "pass123456"
    client.post("/api/auth/register", json={
        "username": cust_b_user, "email": "cust_b@test.com", "password": cust_b_pass,
        "confirm_password": cust_b_pass, "full_name": "Customer B", "phone": "0922000222"
    })
    res_b = client.post("/api/login/", json={"username": cust_b_user, "password": cust_b_pass})
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    res_admin = client.post("/api/login/", json={"username": "admin", "password": "Admin@123"})
    token_admin = res_admin.json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {token_admin}"}

    # Create Ticket for Customer B
    res_b_booking = client.post("/api/booking/", json={
        "customer_name": "Customer B",
        "phone_number": "0922000222",
        "device_type": "phone",
        "brand": "Apple",
        "device_model": "iPhone 14",
        "symptoms": "Bị chai pin nhẹ",
        "branch_id": "Chi nhánh Hà Nội"
    })
    ticket_b_id = res_b_booking.json()["ticket_id"]
    code_b = res_b_booking.json()["booking_id"]
    print(f"[OK] Customer B Ticket created: ID={ticket_b_id}, Code={code_b}")

    # =========================================================================
    # TASK 31: AUTHORIZATION & REPAIR HISTORY CHECKS
    # =========================================================================
    log_step("2. TASK 31 - AUTHORIZATION CHECK (403 FORBIDDEN)")

    # Customer A attempts to access Customer B's ticket detail -> 403 Forbidden
    res_auth_fail = client.get(f"/api/tickets/{ticket_b_id}", headers=headers_a)
    assert res_auth_fail.status_code == 403, f"Customer A accessing Customer B's ticket should return 403, got {res_auth_fail.status_code}"
    print("[OK] Customer A forbidden from accessing Customer B's ticket (403 Forbidden).")

    # Customer B accesses own ticket detail -> 200 OK
    res_auth_b = client.get(f"/api/tickets/{ticket_b_id}", headers=headers_b)
    assert res_auth_b.status_code == 200
    assert res_auth_b.json()["id"] == code_b
    print("[OK] Customer B successfully accessed own ticket (200 OK).")

    # Admin accesses Customer B's ticket detail -> 200 OK
    res_auth_admin = client.get(f"/api/tickets/{ticket_b_id}", headers=headers_admin)
    assert res_auth_admin.status_code == 200
    print("[OK] Admin successfully accessed Customer B's ticket (200 OK).")

    log_step("3. TASK 31 - REPAIR HISTORY SEARCH & PAGINATION")
    res_hist_b = client.get("/api/tickets/my-history?page=1&limit=5", headers=headers_b)
    assert res_hist_b.status_code == 200
    data_b = res_hist_b.json()
    assert "items" in data_b
    assert len(data_b["items"]) >= 1
    assert data_b["total"] >= 1
    print(f"[OK] Customer B retrieved history list ({data_b['total']} records, page {data_b['page']}/{data_b['pages']}).")

    # Search filter check
    res_search = client.get(f"/api/tickets/my-history?q={code_b}", headers=headers_b)
    assert res_search.status_code == 200
    assert len(res_search.json()["items"]) == 1
    print("[OK] History search by ticket code works accurately.")

    # Status filter check
    res_st_filter = client.get("/api/tickets/my-history?status=TiepNhan", headers=headers_b)
    assert res_st_filter.status_code == 200
    assert len(res_st_filter.json()["items"]) >= 1
    print("[OK] History status filter works accurately.")

    # =========================================================================
    # TASK 32: CHANGE PASSWORD CHECKS
    # =========================================================================
    log_step("4. TASK 32 - CHANGE PASSWORD VALIDATION")

    # Wrong current password -> 400
    res_pw1 = client.put("/api/auth/change-password", json={
        "current_password": "wrongpassword", "new_password": "newpass123456", "confirm_password": "newpass123456"
    }, headers=headers_a)
    assert res_pw1.status_code == 400
    print("[OK] Wrong current password rejected (400 Bad Request).")

    # New password same as old password -> 400
    res_pw2 = client.put("/api/auth/change-password", json={
        "current_password": cust_a_pass, "new_password": cust_a_pass, "confirm_password": cust_a_pass
    }, headers=headers_a)
    assert res_pw2.status_code == 400
    print("[OK] Same new password as current password rejected (400 Bad Request).")

    # Valid change password
    new_cust_a_pass = "brandnewpass123"
    res_pw3 = client.put("/api/auth/change-password", json={
        "current_password": cust_a_pass, "new_password": new_cust_a_pass, "confirm_password": new_cust_a_pass
    }, headers=headers_a)
    assert res_pw3.status_code == 200
    print("[OK] Password changed successfully.")

    log_step("5. TASK 32 - RE-AUTHENTICATION CHECK")
    # Login with old password -> 401 Fails
    res_old_login = client.post("/api/login/", json={"username": cust_a_user, "password": cust_a_pass})
    assert res_old_login.status_code == 401
    print("[OK] Login with old password failed (401 Unauthorized).")

    # Login with new password -> 200 Succeeds
    res_new_login = client.post("/api/login/", json={"username": cust_a_user, "password": new_cust_a_pass})
    assert res_new_login.status_code == 200
    print("[OK] Login with new password succeeded (200 OK).")

    print("\n======================================================\nALL TASK 31 & TASK 32 TESTS PASSED SUCCESSFULLY!\n======================================================\n")
    return True

if __name__ == "__main__":
    success = run_all_tests()
    if not success:
        sys.exit(1)
