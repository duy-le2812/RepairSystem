import sys
import os
from datetime import datetime, timedelta

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from fastapi.testclient import TestClient
from main import app, get_db
from database import Base, engine, SessionLocal
import models, schemas

# Setup test DB tables
models.Base.metadata.create_all(bind=engine)

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print("RUNNING TASK 02 VERIFICATION TESTS")
    print("=" * 60)
    
    # 1. Ensure at least one Branch exists in DB
    db = SessionLocal()
    branch = db.query(models.Branch).first()
    if not branch:
        branch = models.Branch(
            name="Chi nhánh Hà Nội Test",
            address="Số 1 Cầu Giấy",
            hotline="0901234567",
            working_hours="8:00 - 18:00"
        )
        db.add(branch)
        db.commit()
        db.refresh(branch)
    branch_id = branch.id
    branch_name = branch.name

    # 2. Ensure an admin user exists with known password
    admin_user = db.query(models.User).filter(models.User.role == "admin").first()
    if not admin_user:
        from main import get_password_hash
        admin_user = models.User(
            username="admin_test_02",
            password_hash=get_password_hash("adminpassword123"),
            role="admin",
            full_name="Admin Test 02"
        )
        db.add(admin_user)
        db.commit()
        admin_username = "admin_test_02"
        admin_pass = "adminpassword123"
    else:
        # Update admin_user password hash for test predictability
        from main import get_password_hash
        admin_user.password_hash = get_password_hash("adminpassword123")
        db.commit()
        admin_username = admin_user.username
        admin_pass = "adminpassword123"

    db.close()
    
    # TEST 01: Guest Booking
    future_date = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")
    booking_payload = {
        "customer_name": "Nguyen Van Guest",
        "phone_number": "0987654321",
        "device_type": "phone",
        "brand": "Apple",
        "device_model": "iPhone 14 Pro",
        "symptoms": "Màn hình bị sọc xanh không nhấn cảm ứng được",
        "branch_id": str(branch_id),
        "appointment_date": future_date,
        "appointment_time": "14:00 - 16:00"
    }
    
    res1 = client.post("/api/booking/", json=booking_payload)
    print(f"Test 01 (Guest Booking) Status: {res1.status_code}")
    assert res1.status_code == 200, f"Expected 200, got {res1.status_code}: {res1.text}"
    b_data = res1.json()
    assert b_data["booking_id"].startswith("FIX-")
    assert b_data["appointment_date"] == future_date
    assert b_data["appointment_time"] == "14:00 - 16:00"
    assert b_data["branch_id"] == str(branch_id)
    assert b_data["branch_name"] == branch_name
    print("  => PASS: Guest booking created successfully with date, time & branch!")

    ticket_code = b_data["booking_id"]
    ticket_numeric_id = b_data["ticket_id"]

    # TEST 03 & 07: DB Persistence Check
    db = SessionLocal()
    ticket_db = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_numeric_id).first()
    assert ticket_db is not None
    assert ticket_db.appointment_date == future_date
    assert ticket_db.appointment_time == "14:00 - 16:00"
    assert ticket_db.branch_id == branch_id
    assert ticket_db.admin_notes is None or not ticket_db.admin_notes.startswith("Chi nhánh:")
    db.close()
    print("  => PASS: Database persisted appointment_date, appointment_time, and branch_id FK correctly!")

    # TEST 04: Appointment Validation
    past_date = "2020-01-01"
    invalid_payload = {**booking_payload, "appointment_date": past_date}
    res_val = client.post("/api/booking/", json=invalid_payload)
    assert res_val.status_code == 400
    print("  => PASS: Validation correctly blocked past appointment date!")

    invalid_branch_payload = {**booking_payload, "branch_id": "99999"}
    res_val2 = client.post("/api/booking/", json=invalid_branch_payload)
    assert res_val2.status_code == 400
    print("  => PASS: Validation correctly blocked non-existent branch_id!")

    # TEST 05: Guest Tracking
    res_track = client.get(f"/api/tickets/search?code={ticket_code}")
    assert res_track.status_code == 200
    track_list = res_track.json()
    assert len(track_list) == 1
    t_item = track_list[0]
    assert t_item["id"] == ticket_code
    assert t_item["appointmentDate"] == future_date
    assert t_item["appointmentTime"] == "14:00 - 16:00"
    assert t_item["branchId"] == str(branch_id)
    assert t_item["branchName"] == branch_name
    # Ensure no sensitive fields are present
    assert "password_hash" not in t_item
    assert "password" not in t_item
    print("  => PASS: Guest tracking works without login and exposes no sensitive fields!")

    # TEST 06: Invalid Tracking
    res_invalid = client.get("/api/tickets/search?code=FIX-999999")
    assert res_invalid.status_code in (404, 200)
    print("  => PASS: Invalid tracking handled cleanly without server error!")

    # TEST 08: Admin Notes Preservation
    login_res = client.post("/api/login/", json={"username": admin_username, "password": admin_pass})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    admin_token = login_res.json()["access_token"]

    headers = {"Authorization": f"Bearer {admin_token}"}
    res_notes = client.put(f"/api/tickets/{ticket_numeric_id}/notes", json={"admin_notes": "Máy xước viền nhẹ"}, headers=headers)
    assert res_notes.status_code == 200
    
    db = SessionLocal()
    ticket_db_notes = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_numeric_id).first()
    assert ticket_db_notes.admin_notes == "Máy xước viền nhẹ"
    assert ticket_db_notes.branch_id == branch_id
    db.close()
    print("  => PASS: Admin notes updated without corrupting branch_id!")

    # TEST 09: Status transitions
    res_status = client.put(f"/api/tickets/{ticket_numeric_id}/status?new_status=DangKiemTra", headers=headers)
    assert res_status.status_code == 200
    print("  => PASS: Status transition DangKiemTra works smoothly!")

    # TEST 10: Admin Ticket list check
    res_admin_tickets = client.get("/api/admin/tickets", headers=headers)
    assert res_admin_tickets.status_code == 200
    admin_tickets = res_admin_tickets.json()
    matched_admin_ticket = next((t for t in admin_tickets if t["id"] == ticket_code), None)
    assert matched_admin_ticket is not None
    assert matched_admin_ticket["appointmentDate"] == future_date
    assert matched_admin_ticket["appointmentTime"] == "14:00 - 16:00"
    assert matched_admin_ticket["branchId"] == str(branch_id)
    assert matched_admin_ticket["branchName"] == branch_name
    print("  => PASS: Admin ticket list correctly includes branch and appointment fields!")

    print("=" * 60)
    print("ALL 10 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
