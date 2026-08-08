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
    print(f"\n======================================================\n[TEST TASK 30] {title}\n======================================================")

def run_all_tests():
    client = TestClient(app)
    
    log_step("1. SETUP TEST USERS")
    user_a_name = "task30_user_a"
    user_a_email = "task30_a@test.com"
    user_a_phone = "0911223344"
    user_a_pass = "password123"

    user_b_name = "task30_user_b"
    user_b_email = "task30_b@test.com"
    user_b_phone = "0955667788"
    user_b_pass = "password123"

    client.post("/api/auth/register", json={
        "username": user_a_name, "email": user_a_email, "password": user_a_pass,
        "confirm_password": user_a_pass, "full_name": "Nguyen Van A Task30", "phone": user_a_phone
    })

    client.post("/api/auth/register", json={
        "username": user_b_name, "email": user_b_email, "password": user_b_pass,
        "confirm_password": user_b_pass, "full_name": "Tran Van B Task30", "phone": user_b_phone
    })

    # Login User A
    res_login_a = client.post("/api/login/", json={"username": user_a_name, "password": user_a_pass})
    assert res_login_a.status_code == 200
    token_a = res_login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    print("[OK] User A and User B registered and User A logged in.")

    # 2. VIEW PROFILE INFO
    log_step("2. VIEW PROFILE INFO (READ-ONLY & DISPLAY FIELDS)")
    res_me = client.get("/api/auth/me", headers=headers_a)
    assert res_me.status_code == 200
    profile_a = res_me.json()
    
    # Check fields existence
    assert "id" in profile_a
    assert "username" in profile_a
    assert "role" in profile_a
    assert "created_at" in profile_a
    assert profile_a["username"] == user_a_name
    assert profile_a["role"] == "customer"
    print(f"[OK] Profile info verified: ID={profile_a['id']}, Username={profile_a['username']}, Role={profile_a['role']}, CreatedAt={profile_a['created_at']}")

    # 3. VALIDATION RULES (NAME, EMAIL, PHONE)
    log_step("3. EDIT VALIDATION RULES")

    # A. Empty Full Name -> 422 / 400
    res_v1 = client.put("/api/auth/me", json={"full_name": "   "}, headers=headers_a)
    assert res_v1.status_code in (400, 422), f"Empty full_name should fail, got {res_v1.status_code}"
    print("[OK] Empty full_name correctly rejected.")

    # B. Full Name > 100 chars -> 422 / 400
    res_v2 = client.put("/api/auth/me", json={"full_name": "A" * 105}, headers=headers_a)
    assert res_v2.status_code in (400, 422), f"Long full_name should fail, got {res_v2.status_code}"
    print("[OK] Over-length full_name (>100 chars) correctly rejected.")

    # C. Phone containing letters -> 422 / 400
    res_v3 = client.put("/api/auth/me", json={"phone": "0912abc345"}, headers=headers_a)
    assert res_v3.status_code in (400, 422), f"Phone with letters should fail, got {res_v3.status_code}"
    print("[OK] Phone with letters correctly rejected.")

    # D. Invalid Email Format -> 422 / 400
    res_v4 = client.put("/api/auth/me", json={"email": "invalid_email_format"}, headers=headers_a)
    assert res_v4.status_code in (400, 422), f"Invalid email format should fail, got {res_v4.status_code}"
    print("[OK] Invalid email format correctly rejected.")

    # E. Duplicate Email belonging to User B -> 400
    res_v5 = client.put("/api/auth/me", json={"email": user_b_email}, headers=headers_a)
    assert res_v5.status_code == 400, f"Duplicate email should fail with 400, got {res_v5.status_code}"
    print("[OK] Duplicate email belonging to another user correctly rejected (400 Bad Request).")

    # 4. SUCCESSFUL PROFILE UPDATES & REFRESH PERSISTENCE
    log_step("4. SUCCESSFUL PROFILE UPDATE & PERSISTENCE")
    new_name = "Nguyen Van A Renewed"
    new_email = "task30_a_updated@test.com"
    new_phone = "0933445566"

    res_ok = client.put("/api/auth/me", json={
        "full_name": new_name,
        "email": new_email,
        "phone": new_phone
    }, headers=headers_a)
    assert res_ok.status_code == 200, f"Expected 200 OK, got {res_ok.status_code}"
    updated_res = res_ok.json()
    assert updated_res["full_name"] == new_name
    assert updated_res["email"] == new_email
    assert updated_res["phone"] == new_phone
    print("[OK] Profile updated successfully in database.")

    # Refresh check /api/auth/me
    res_refresh = client.get("/api/auth/me", headers=headers_a)
    assert res_refresh.status_code == 200
    refreshed_profile = res_refresh.json()
    assert refreshed_profile["full_name"] == new_name
    assert refreshed_profile["email"] == new_email
    assert refreshed_profile["phone"] == new_phone
    assert refreshed_profile["id"] == profile_a["id"]
    assert refreshed_profile["username"] == profile_a["username"]
    assert refreshed_profile["role"] == profile_a["role"]
    print("[OK] Verified page refresh persistence: updated fields remain intact, read-only fields unmutated.")

    print("\n======================================================\nALL TASK 30 TESTS PASSED SUCCESSFULLY!\n======================================================\n")
    return True

if __name__ == "__main__":
    success = run_all_tests()
    if not success:
        sys.exit(1)
