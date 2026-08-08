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
from database import SessionLocal
import models

def log_step(title):
    print(f"\n======================================================\n[TASK 33 AUDIT] {title}\n======================================================")

def run_e2e_audit():
    client = TestClient(app)
    db = SessionLocal()

    # Setup Customer Account
    log_step("1. SETUP & AUTHENTICATION")
    username = "task33_auditor"
    password = "password123"
    phone = "0977889900"
    email = "auditor@test.com"

    # Register
    res_reg = client.post("/api/auth/register", json={
        "username": username, "email": email, "password": password,
        "confirm_password": password, "full_name": "Nguyen Auditor", "phone": phone
    })
    
    # Login
    res_login = client.post("/api/login/", json={"username": username, "password": password})
    assert res_login.status_code == 200
    token = res_login.json()["access_token"]
    user_id = res_login.json()["user_id"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[OK] Customer logged in: Username={username}, UserID={user_id}")

    # =========================================================================
    # STEP 1: CREATE BOOKING (LOGGED IN CUSTOMER)
    # =========================================================================
    log_step("2. CREATE BOOKING REQUEST (FRONTEND -> BACKEND)")
    booking_data = {
        "customer_name": "Nguyen Auditor",
        "phone_number": phone,
        "device_type": "laptop",
        "brand": "Asus",
        "device_model": "ROG Zephyrus G14",
        "symptoms": "Quạt kêu to và sập nguồn khi chơi game",
        "branch_id": "Chi nhánh Hà Nội"
    }

    res_booking = client.post("/api/booking/", json=booking_data, headers=headers)
    assert res_booking.status_code in (200, 201), f"Expected 200/201, got {res_booking.status_code}"
    booking_resp = res_booking.json()
    
    print(f"[RESPONSE JSON] HTTP {res_booking.status_code}:")
    print(booking_resp)

    # Validate Response Fields (Phần 3 & 7)
    assert "booking_id" in booking_resp and booking_resp["booking_id"].startswith("FIX-")
    assert "ticket_id" in booking_resp
    assert "user_id" in booking_resp
    assert "status" in booking_resp
    
    ticket_id = booking_resp["ticket_id"]
    tracking_code = booking_resp["booking_id"]
    assigned_user_id = booking_resp["user_id"]

    assert assigned_user_id == user_id, f"CRITICAL BUG: Ticket assigned to user_id {assigned_user_id} instead of logged-in user_id {user_id}"
    print(f"[OK] Ticket created: ID={ticket_id}, Code={tracking_code}, Assigned UserID={assigned_user_id}")

    # =========================================================================
    # STEP 2: DATABASE DIRECT VERIFICATION (Phần 2, 6, 11)
    # =========================================================================
    log_step("3. DIRECT DATABASE VERIFICATION")
    ticket_db = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
    assert ticket_db is not None, "Ticket record NOT found in PostgreSQL Database!"
    
    device_db = db.query(models.Device).filter(models.Device.id == ticket_db.device_id).first()
    assert device_db is not None, "Device record NOT found in PostgreSQL Database!"
    assert device_db.user_id == user_id, f"Database Mismatch: device.user_id ({device_db.user_id}) != customer.id ({user_id})"
    
    assert ticket_db.status == "TiepNhan", f"Expected default status 'TiepNhan', got '{ticket_db.status}'"
    assert ticket_db.created_at is not None, "ticket.created_at is NULL!"
    assert ticket_db.symptoms == booking_data["symptoms"], f"ticket.symptoms mismatch in DB!"
    
    # Audit history check
    histories_db = db.query(models.TicketHistory).filter(models.TicketHistory.ticket_id == ticket_id).all()
    assert len(histories_db) >= 1, "Initial TicketHistory audit record missing in DB!"
    print(f"[OK] Database direct check verified: Device.user_id={device_db.user_id}, Status={ticket_db.status}, Symptoms='{ticket_db.symptoms}', Audit Logs={len(histories_db)}")

    # =========================================================================
    # STEP 3: REPAIR HISTORY API VERIFICATION (Phần 4)
    # =========================================================================
    log_step("4. REPAIR HISTORY API VERIFICATION (/api/tickets/my-history)")
    res_hist = client.get("/api/tickets/my-history", headers=headers)
    assert res_hist.status_code == 200, f"Expected 200, got {res_hist.status_code}"
    hist_data = res_hist.json()
    items = hist_data.get("items", hist_data) if isinstance(hist_data, dict) else hist_data

    matched = [t for t in items if t["id"] == tracking_code]
    assert len(matched) == 1, f"BUG CONFIRMED: Created ticket {tracking_code} NOT FOUND in Repair History API! Returned items: {items}"
    print(f"[OK] Repair History API successfully returned newly created ticket {tracking_code} for logged-in customer!")

    # =========================================================================
    # STEP 4: TRACKING API VERIFICATION (Phần 5)
    # =========================================================================
    log_step("5. PROGRESS TRACKING API VERIFICATION (/api/tickets/search)")
    res_track = client.get(f"/api/tickets/search?code={tracking_code}", headers=headers)
    assert res_track.status_code == 200, f"Expected 200, got {res_track.status_code}"
    track_items = res_track.json()
    assert len(track_items) >= 1, f"BUG CONFIRMED: Search by tracking code {tracking_code} returned 0 results!"
    assert track_items[0]["id"] == tracking_code
    print(f"[OK] Progress Tracking API successfully found ticket by tracking code {tracking_code}!")

    # =========================================================================
    # STEP 5: AUTHORIZATION & ADMIN ACCESS (Phần 9)
    # =========================================================================
    log_step("6. AUTHORIZATION & ADMIN DASHBOARD VERIFICATION")
    # Customer B cannot view Customer A's ticket
    res_cust_b_login = client.post("/api/login/", json={"username": "task31_cust_b", "password": "pass123456"})
    if res_cust_b_login.status_code == 200:
        token_b = res_cust_b_login.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}
        res_cross = client.get(f"/api/tickets/{ticket_id}", headers=headers_b)
        assert res_cross.status_code == 403, f"Unauthorized cross-customer access should return 403, got {res_cross.status_code}"
        print("[OK] Customer B prevented from reading Customer A's ticket (403 Forbidden).")

    # Admin Dashboard view
    res_admin_login = client.post("/api/login/", json={"username": "admin", "password": "Admin@123"})
    assert res_admin_login.status_code == 200
    token_admin = res_admin_login.json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {token_admin}"}
    
    res_admin_tickets = client.get("/api/admin/tickets", headers=headers_admin)
    assert res_admin_tickets.status_code == 200
    admin_items = res_admin_tickets.json()
    admin_matched = [t for t in admin_items if t["id"] == tracking_code]
    assert len(admin_matched) == 1, "Admin Dashboard failed to retrieve the new ticket!"
    print(f"[OK] Admin Dashboard successfully retrieved newly created ticket {tracking_code}!")

    db.close()
    print("\n======================================================\n🎉 END-TO-END DATA FLOW AUDIT & REGRESSION TEST PASSED 100%!\n======================================================\n")
    return True

if __name__ == "__main__":
    success = run_e2e_audit()
    if not success:
        sys.exit(1)
