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
    
    # 1. GUEST ACCESS CHECK
    log_step("1. GUEST ACCESS CHECK (UNAUTHENTICATED)")
    res_g1 = client.get("/api/auth/me")
    assert res_g1.status_code == 401, f"Guest accessing /api/auth/me should return 401, got {res_g1.status_code}"
    
    res_g2 = client.put("/api/auth/me", json={"full_name": "Hack"})
    assert res_g2.status_code == 401, f"Guest updating profile should return 401, got {res_g2.status_code}"
    
    res_g3 = client.put("/api/auth/change-password", json={"current_password": "123", "new_password": "456", "confirm_password": "456"})
    assert res_g3.status_code == 401, f"Guest changing password should return 401, got {res_g3.status_code}"
    
    res_g4 = client.get("/api/tickets/my-history")
    assert res_g4.status_code == 401, f"Guest getting history should return 401, got {res_g4.status_code}"
    print("[OK] Guest accesses correctly blocked with 401 Unauthorized.")

    # 2. CUSTOMER REGISTRATION & PROFILE MANAGEMENT
    log_step("2. CUSTOMER REGISTRATION & PROFILE MANAGEMENT")
    cust_username = "task29_user"
    cust_email = "task29@example.com"
    cust_phone = "0988776655"
    cust_pass = "oldpassword123"

    res_reg = client.post("/api/auth/register", json={
        "username": cust_username,
        "email": cust_email,
        "password": cust_pass,
        "confirm_password": cust_pass,
        "full_name": "Nguyen Van Task29",
        "phone": cust_phone
    })
    if res_reg.status_code != 200:
        # If already exists from previous test run
        pass

    res_login = client.post("/api/login/", json={"username": cust_username, "password": cust_pass})
    assert res_login.status_code == 200, f"Customer login failed: {res_login.status_code}"
    cust_token = res_login.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    print("[OK] Customer registered and logged in successfully.")

    # Fetch Profile /api/auth/me
    res_me = client.get("/api/auth/me", headers=cust_headers)
    assert res_me.status_code == 200
    profile = res_me.json()
    assert profile["username"] == cust_username
    assert profile["full_name"] == "Nguyen Van Task29"
    print("[OK] /api/auth/me returned correct profile info.")

    # Update Profile PUT /api/auth/me
    updated_name = "Nguyen Van Updated Task29"
    res_upd = client.put("/api/auth/me", json={"full_name": updated_name, "phone": "0912345678"}, headers=cust_headers)
    assert res_upd.status_code == 200
    assert res_upd.json()["full_name"] == updated_name
    assert res_upd.json()["phone"] == "0912345678"
    print("[OK] /api/auth/me successfully updated profile details.")

    # 3. CHANGE PASSWORD
    log_step("3. CHANGE PASSWORD VERIFICATION")
    # Wrong current password -> 400
    res_pw_err = client.put("/api/auth/change-password", json={
        "current_password": "wrongpassword",
        "new_password": "newpassword123",
        "confirm_password": "newpassword123"
    }, headers=cust_headers)
    assert res_pw_err.status_code == 400
    print("[OK] Wrong current password rejected with 400 Bad Request.")

    # Valid change password
    new_pass = "newpassword123"
    res_pw_ok = client.put("/api/auth/change-password", json={
        "current_password": cust_pass,
        "new_password": new_pass,
        "confirm_password": new_pass
    }, headers=cust_headers)
    assert res_pw_ok.status_code == 200
    print("[OK] Password changed successfully.")

    # Login with new password
    res_new_login = client.post("/api/login/", json={"username": cust_username, "password": new_pass})
    assert res_new_login.status_code == 200, "Login with new password failed"
    new_cust_token = res_new_login.json()["access_token"]
    new_cust_headers = {"Authorization": f"Bearer {new_cust_token}"}
    print("[OK] Login with new password succeeded.")

    # 4. CUSTOMER REPAIR HISTORY
    log_step("4. CUSTOMER REPAIR HISTORY")
    # Create booking under customer's phone
    booking_data = {
        "customer_name": updated_name,
        "phone_number": "0912345678",
        "device_type": "phone",
        "brand": "Samsung",
        "device_model": "Galaxy S22",
        "symptoms": "Hỏng pin",
        "branch_id": "Chi nhánh TP.HCM"
    }
    client.post("/api/booking/", json=booking_data)

    res_hist = client.get("/api/tickets/my-history", headers=new_cust_headers)
    assert res_hist.status_code == 200
    hist_tickets = res_hist.json()
    assert len(hist_tickets) >= 1
    assert hist_tickets[0]["deviceModel"] == "Galaxy S22"
    print(f"[OK] /api/tickets/my-history returned {len(hist_tickets)} repair tickets for customer.")

    # 5. ADMIN FLOW ISOLATION
    log_step("5. ADMIN FLOW ISOLATION")
    res_admin_login = client.post("/api/login/", json={"username": "admin", "password": "Admin@123"})
    assert res_admin_login.status_code == 200
    assert res_admin_login.json()["role"] == "admin"
    print("[OK] Admin flow preserved cleanly.")

    print("\n======================================================\nALL TASK 29 TESTS PASSED SUCCESSFULLY!\n======================================================\n")
    return True

if __name__ == "__main__":
    success = run_all_tests()
    if not success:
        sys.exit(1)
