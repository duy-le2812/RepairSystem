import sys
import os
from datetime import datetime, timedelta

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from fastapi.testclient import TestClient
from main import app, get_db
from database import Base, engine, SessionLocal
import models, schemas
from services.catalog_seeder import seed_catalog

client = TestClient(app)

def run_task06_tests():
    print("=" * 70)
    print("RUNNING TASK 06 TECHNICIAN WORKBOARD & REPAIR EXECUTION VERIFICATION TESTS")
    print("=" * 70)

    db = SessionLocal()
    seed_catalog(db)

    from main import get_password_hash
    # Admin User
    admin_user = db.query(models.User).filter(models.User.role == "admin").first()
    if not admin_user:
        admin_user = models.User(
            username="admin_test_06",
            password_hash=get_password_hash("adminpassword123"),
            role="admin",
            full_name="Admin Test 06"
        )
        db.add(admin_user)
        db.commit()

    # Technician 1
    tech1 = db.query(models.User).filter(models.User.username == "tech1_test").first()
    if not tech1:
        tech1 = models.User(
            username="tech1_test",
            password_hash=get_password_hash("techpassword123"),
            role="technician",
            full_name="Kỹ Thuật Viên 1",
            phone="0988000111"
        )
        db.add(tech1)
        db.commit()

    # Technician 2
    tech2 = db.query(models.User).filter(models.User.username == "tech2_test").first()
    if not tech2:
        tech2 = models.User(
            username="tech2_test",
            password_hash=get_password_hash("techpassword123"),
            role="technician",
            full_name="Kỹ Thuật Viên 2",
            phone="0988000222"
        )
        db.add(tech2)
        db.commit()

    admin_username = admin_user.username
    tech1_id = tech1.id
    tech2_id = tech2.id

    db.close()

    # Logins
    admin_login = client.post("/api/login/", json={"username": admin_username, "password": "adminpassword123"})
    assert admin_login.status_code == 200
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    tech1_login = client.post("/api/login/", json={"username": "tech1_test", "password": "techpassword123"})
    assert tech1_login.status_code == 200
    tech1_headers = {"Authorization": f"Bearer {tech1_login.json()['access_token']}"}

    tech2_login = client.post("/api/login/", json={"username": "tech2_test", "password": "techpassword123"})
    assert tech2_login.status_code == 200
    tech2_headers = {"Authorization": f"Bearer {tech2_login.json()['access_token']}"}

    # 1. Create a booking
    future_date = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")
    b_res = client.post("/api/booking/", json={
        "customer_name": "Task 06 Customer",
        "phone_number": "0911555666",
        "device_type": "phone",
        "brand": "Apple",
        "device_model": "iPhone 13 Pro",
        "symptoms": "Hỏng IC hiển thị màn hình",
        "appointment_date": future_date,
        "appointment_time": "10:00 - 11:00"
    })
    assert b_res.status_code == 200
    t_id = b_res.json()["ticket_id"]
    t_code = b_res.json()["booking_id"]

    # Assign technician 1
    assign_res = client.post(f"/api/technician/tickets/{t_id}/assign", json={"technician_id": tech1_id}, headers=admin_headers)
    assert assign_res.status_code == 200
    assert assign_res.json()["technician_id"] == tech1_id

    # -------------------------------------------------------------
    # TEST 01 & 02: Workboard Authorization & Admin View
    # -------------------------------------------------------------
    wb_tech1 = client.get("/api/technician/workboard", headers=tech1_headers)
    assert wb_tech1.status_code == 200
    wb_admin = client.get("/api/technician/workboard", headers=admin_headers)
    assert wb_admin.status_code == 200
    print("  => TEST 01 & 02 (Workboard Auth & Admin View): PASS")

    # -------------------------------------------------------------
    # TEST 03: Technician 2 Cannot Access Technician 1 Ticket Detail
    # -------------------------------------------------------------
    t2_detail = client.get(f"/api/technician/tickets/{t_id}", headers=tech2_headers)
    assert t2_detail.status_code == 403, f"Test 03 Failed (Expected 403): {t2_detail.text}"
    print("  => TEST 03 (Unassigned Technician Access Blocked): PASS")

    # -------------------------------------------------------------
    # TEST 04: Start Repair Before Quotation Approved Rejected
    # -------------------------------------------------------------
    start_unapp = client.post(f"/api/technician/tickets/{t_id}/start", headers=tech1_headers)
    assert start_unapp.status_code == 409, f"Test 04 Failed (Expected 409): {start_unapp.text}"
    print("  => TEST 04 (Start Repair Before Approval Rejected): PASS")

    # Admin Diagnosis & Quotation -> Customer Approves
    client.post(f"/api/tickets/{t_id}/diagnosis", json={
        "inspection_result": "Cáp màn hình vỡ, IC hiển thị hỏng",
        "root_cause": "Va đập vật lý",
        "proposed_solution": "Thay màn hình iPhone 13 Pro"
    }, headers=admin_headers)

    client.post(f"/api/tickets/{t_id}/quotation", json={
        "labor_cost": 200000,
        "additional_cost": 0,
        "is_draft": False,
        "parts": [{"part_name": "Màn hình iPhone 13 Pro", "unit_price": 3500000, "quantity": 1}]
    }, headers=admin_headers)

    client.post(f"/api/tickets/{t_id}/quotation/respond", json={"decision": "approved"})

    # -------------------------------------------------------------
    # TEST 05 & 06: Start Repair Success & Idempotency
    # -------------------------------------------------------------
    start_res1 = client.post(f"/api/technician/tickets/{t_id}/start", headers=tech1_headers)
    assert start_res1.status_code == 200
    s_data = start_res1.json()
    assert s_data["status"] == "DangSua"
    assert s_data["repair_started_at"] is not None

    start_res2 = client.post(f"/api/technician/tickets/{t_id}/start", headers=tech1_headers)
    assert start_res2.status_code == 200
    assert start_res2.json()["repair_started_at"] == s_data["repair_started_at"]
    print("  => TEST 05 & 06 (Start Repair Success & Idempotency): PASS")

    # -------------------------------------------------------------
    # TEST 07, 08, 09: Actual Parts Execution & Validations
    # -------------------------------------------------------------
    # Invalid Price (< 0)
    exec_bad_price = client.patch(f"/api/technician/tickets/{t_id}/execution", json={
        "parts_used": [{"part_name": "Man hinh", "unit_price": -100, "quantity": 1}]
    }, headers=tech1_headers)
    assert exec_bad_price.status_code in [400, 422], f"Bad price expected 400/422, got {exec_bad_price.status_code}"

    # Invalid Quantity (<= 0)
    exec_bad_qty = client.patch(f"/api/technician/tickets/{t_id}/execution", json={
        "parts_used": [{"part_name": "Man hinh", "unit_price": 1000, "quantity": 0}]
    }, headers=tech1_headers)
    assert exec_bad_qty.status_code in [400, 422], f"Bad qty expected 400/422, got {exec_bad_qty.status_code}"

    # Valid Execution Save
    exec_good = client.patch(f"/api/technician/tickets/{t_id}/execution", json={
        "repair_result": "Đã thay thế màn hình chính hãng, ép kính mượt mà.",
        "parts_used": [{"part_name": "Màn hình iPhone 13 Pro Zin", "unit_price": 3500000, "quantity": 1}]
    }, headers=tech1_headers)
    assert exec_good.status_code == 200
    exec_data = exec_good.json()
    assert len(exec_data["actual_parts"]) == 1
    assert exec_data["actual_parts"][0]["subtotal"] == 3500000
    print("  => TEST 07, 08, 09 (Actual Parts & Validation): PASS")

    # -------------------------------------------------------------
    # TEST 10 & 11: Complete Repair & Repair Result Empty Check
    # -------------------------------------------------------------
    # Clear repair_result to test empty validation
    client.patch(f"/api/technician/tickets/{t_id}/execution", json={"repair_result": "   "}, headers=tech1_headers)
    comp_empty = client.post(f"/api/technician/tickets/{t_id}/complete", headers=tech1_headers)
    assert comp_empty.status_code == 400

    # Re-set repair_result and complete
    client.patch(f"/api/technician/tickets/{t_id}/execution", json={"repair_result": "Thay màn hình hoàn tất, test hiển thị sắc nét."}, headers=tech1_headers)
    comp_good = client.post(f"/api/technician/tickets/{t_id}/complete", headers=tech1_headers)
    assert comp_good.status_code == 200
    assert comp_good.json()["status"] == "DaSuaXong"
    assert comp_good.json()["repair_completed_at"] is not None
    print("  => TEST 10 & 11 (Complete Repair & Validation): PASS")

    # -------------------------------------------------------------
    # TEST 15 & 16: QC Fail Flow -> Returns to DangSua (Requires note)
    # -------------------------------------------------------------
    # QC Fail without note -> 400
    qc_no_note = client.post(f"/api/technician/tickets/{t_id}/qc", json={"result": "failed", "note": "  "}, headers=admin_headers)
    assert qc_no_note.status_code == 400

    # QC Fail with note -> status back to DangSua
    qc_fail = client.post(f"/api/technician/tickets/{t_id}/qc", json={"result": "failed", "note": "Cảm ứng góc dưới hơi chập chờn"}, headers=admin_headers)
    assert qc_fail.status_code == 200
    assert qc_fail.json()["status"] == "DangSua"
    assert qc_fail.json()["qc_status"] == "FAILED"
    print("  => TEST 15 & 16 (QC Fail Flow & Note Requirement): PASS")

    # Re-repair and complete again
    client.post(f"/api/technician/tickets/{t_id}/start", headers=tech1_headers)
    client.patch(f"/api/technician/tickets/{t_id}/execution", json={"repair_result": "Đã chỉnh lại cáp cảm ứng góc dưới mượt mà."}, headers=tech1_headers)
    client.post(f"/api/technician/tickets/{t_id}/complete", headers=tech1_headers)

    # -------------------------------------------------------------
    # TEST 14: QC Pass Flow -> Final Completion State
    # -------------------------------------------------------------
    qc_pass = client.post(f"/api/technician/tickets/{t_id}/qc", json={"result": "passed", "note": "Đã test lại cảm ứng 100% đạt chuẩn"}, headers=admin_headers)
    assert qc_pass.status_code == 200
    assert qc_pass.json()["status"] in ["HoanThanh", "HoanTat"]
    assert qc_pass.json()["qc_status"] == "PASSED"
    print("  => TEST 14 (QC Pass Flow): PASS")

    # -------------------------------------------------------------
    # TEST 18 & 19: Customer Tracking Progress & Security
    # -------------------------------------------------------------
    track_res = client.get(f"/api/tickets/search?code={t_code}")
    assert track_res.status_code == 200
    t_track = track_res.json()[0]
    assert t_track["status"] in ["HoanThanh", "HoanTat"]
    assert "password_hash" not in str(t_track)
    print("  => TEST 18 & 19 (Customer Tracking Progress & Security): PASS")

    print("=" * 70)
    print("ALL TASK 06 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_task06_tests()
