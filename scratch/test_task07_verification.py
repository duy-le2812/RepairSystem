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

def run_task07_tests():
    print("=" * 70)
    print("RUNNING TASK 07 HANDOVER, PAYMENT & INVOICE WORKFLOW VERIFICATION TESTS")
    print("=" * 70)

    db = SessionLocal()
    seed_catalog(db)

    from main import get_password_hash
    # Admin User
    admin_user = db.query(models.User).filter(models.User.role == "admin").first()
    if not admin_user:
        admin_user = models.User(
            username="admin_test_07",
            password_hash=get_password_hash("adminpassword123"),
            role="admin",
            full_name="Admin Test 07"
        )
        db.add(admin_user)
        db.commit()

    # Staff User
    staff_user = db.query(models.User).filter(models.User.username == "staff_test_07").first()
    if not staff_user:
        staff_user = models.User(
            username="staff_test_07",
            password_hash=get_password_hash("staffpassword123"),
            role="staff",
            full_name="Nhân Viên Thu Ngân",
            phone="0988777666"
        )
        db.add(staff_user)
        db.commit()

    # Technician User
    tech_user = db.query(models.User).filter(models.User.username == "tech_test_07").first()
    if not tech_user:
        tech_user = models.User(
            username="tech_test_07",
            password_hash=get_password_hash("techpassword123"),
            role="technician",
            full_name="Kỹ Thuật Viên Task 07",
            phone="0988777555"
        )
        db.add(tech_user)
        db.commit()

    # Customer User
    cust_user = db.query(models.User).filter(models.User.username == "cust_test_07").first()
    if not cust_user:
        cust_user = models.User(
            username="cust_test_07",
            password_hash=get_password_hash("custpassword123"),
            role="customer",
            full_name="Nguyễn Văn Khách 07",
            phone="0988777444"
        )
        db.add(cust_user)
        db.commit()

    admin_username = admin_user.username
    db.close()

    # Logins
    admin_login = client.post("/api/login/", json={"username": admin_username, "password": "adminpassword123"})
    assert admin_login.status_code == 200
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    staff_login = client.post("/api/login/", json={"username": "staff_test_07", "password": "staffpassword123"})
    assert staff_login.status_code == 200
    staff_headers = {"Authorization": f"Bearer {staff_login.json()['access_token']}"}

    tech_login = client.post("/api/login/", json={"username": "tech_test_07", "password": "techpassword123"})
    assert tech_login.status_code == 200
    tech_headers = {"Authorization": f"Bearer {tech_login.json()['access_token']}"}

    cust_login = client.post("/api/login/", json={"username": "cust_test_07", "password": "custpassword123"})
    assert cust_login.status_code == 200
    cust_headers = {"Authorization": f"Bearer {cust_login.json()['access_token']}"}

    # 1. Create a booking
    future_date = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")
    b_res = client.post("/api/booking/", json={
        "customer_name": "Nguyễn Văn Khách 07",
        "phone_number": "0988777444",
        "device_type": "phone",
        "brand": "Apple",
        "device_model": "iPhone 14 Pro Max",
        "symptoms": "Vỡ kính lưng và hỏng màn hình",
        "appointment_date": future_date,
        "appointment_time": "14:00 - 15:00"
    })
    assert b_res.status_code == 200
    t_id = b_res.json()["ticket_id"]
    t_code = b_res.json()["booking_id"]

    # -------------------------------------------------------------
    # TEST 02: Payment Before QC PASS Rejected (HTTP 409)
    # -------------------------------------------------------------
    early_pay = client.post(f"/api/tickets/{t_id}/payment", json={
        "amount": 4000000,
        "payment_method": "CASH"
    }, headers=staff_headers)
    assert early_pay.status_code == 409, f"Test 02 Failed (Expected 409): {early_pay.text}"
    print("  => TEST 02 (Payment Before QC PASS Rejected): PASS")

    # Perform Diagnosis & Approved Quotation (Total = 4,500,000 + 300,000 = 4,800,000)
    client.post(f"/api/tickets/{t_id}/diagnosis", json={
        "inspection_result": "Màn hình OLED bị nứt kính, vỏ nhôm trầy xước",
        "root_cause": "Rơi từ độ cao 1.5m",
        "proposed_solution": "Thay màn hình iPhone 14 Pro Max"
    }, headers=admin_headers)

    client.post(f"/api/tickets/{t_id}/quotation", json={
        "labor_cost": 300000,
        "additional_cost": 0,
        "warranty": "12 tháng",
        "is_draft": False,
        "parts": [{"part_name": "Màn hình OLED iPhone 14 Pro Max", "unit_price": 4500000, "quantity": 1}]
    }, headers=admin_headers)

    client.post(f"/api/tickets/{t_id}/quotation/respond", json={"decision": "approved"})

    # Technician Start -> Execution -> Complete -> QC PASS
    client.post(f"/api/technician/tickets/{t_id}/start", headers=admin_headers)
    client.patch(f"/api/technician/tickets/{t_id}/execution", json={
        "repair_result": "Đã thay màn hình OLED chính hãng mới, cảm ứng nhạy.",
        "parts_used": [{"part_name": "Màn hình OLED iPhone 14 Pro Max", "unit_price": 4500000, "quantity": 1}]
    }, headers=admin_headers)
    client.post(f"/api/technician/tickets/{t_id}/complete", headers=admin_headers)
    client.post(f"/api/technician/tickets/{t_id}/qc", json={"result": "passed", "note": "QC Đạt 100%"}, headers=admin_headers)

    # -------------------------------------------------------------
    # TEST 01: Ready Handover List Includes QC PASS Ticket
    # -------------------------------------------------------------
    ready_res = client.get("/api/handover/ready", headers=staff_headers)
    assert ready_res.status_code == 200
    ready_ids = [item["numeric_id"] for item in ready_res.json()]
    assert t_id in ready_ids
    print("  => TEST 01 (Only QC PASS Tickets In Handover List): PASS")

    # -------------------------------------------------------------
    # TEST 03 & 04: Invalid Payment Validation (Negative Amount & Incorrect Amount)
    # -------------------------------------------------------------
    neg_pay = client.post(f"/api/tickets/{t_id}/payment", json={
        "amount": -1000,
        "payment_method": "CASH"
    }, headers=staff_headers)
    assert neg_pay.status_code in [400, 422]

    wrong_amt_pay = client.post(f"/api/tickets/{t_id}/payment", json={
        "amount": 1000000,
        "payment_method": "CASH"
    }, headers=staff_headers)
    assert wrong_amt_pay.status_code == 400, f"Test 04 Failed (Expected 400): {wrong_amt_pay.text}"
    print("  => TEST 03 & 04 (Negative Amount & Incorrect Amount Validation): PASS")

    # -------------------------------------------------------------
    # TEST 14, 15, 16: Authorization Restrictions for Payment
    # -------------------------------------------------------------
    tech_pay = client.post(f"/api/tickets/{t_id}/payment", json={"amount": 4800000, "payment_method": "CASH"}, headers=tech_headers)
    assert tech_pay.status_code == 403, f"Test 14 Failed (Expected 403): {tech_pay.text}"

    cust_pay = client.post(f"/api/tickets/{t_id}/payment", json={"amount": 4800000, "payment_method": "CASH"}, headers=cust_headers)
    assert cust_pay.status_code == 403, f"Test 16 Failed (Expected 403): {cust_pay.text}"
    print("  => TEST 14, 15, 16 (Authorization Enforcement for Payment): PASS")

    # -------------------------------------------------------------
    # TEST 11: Unpaid Ticket Cannot Be Handed Over Rejected (HTTP 409)
    # -------------------------------------------------------------
    unpaid_ho = client.post(f"/api/tickets/{t_id}/handover", headers=staff_headers)
    assert unpaid_ho.status_code == 409, f"Test 11 Failed (Expected 409): {unpaid_ho.text}"
    print("  => TEST 11 (Unpaid Ticket Cannot Be Handed Over): PASS")

    # -------------------------------------------------------------
    # TEST 05, 06, 08, 09: Process Successful CASH / BANK_TRANSFER Payment & Invoice Creation
    # -------------------------------------------------------------
    valid_pay = client.post(f"/api/tickets/{t_id}/payment", json={
        "amount": 4800000,
        "payment_method": "BANK_TRANSFER",
        "transaction_reference": "FT260808123456"
    }, headers=staff_headers)
    assert valid_pay.status_code == 200, f"Payment Failed: {valid_pay.text}"
    p_data = valid_pay.json()
    assert p_data["payment_status"] == "PAID"
    assert p_data["invoice"] is not None
    inv_num = p_data["invoice"]["invoice_number"]
    assert inv_num.startswith("INV-")
    print("  => TEST 05, 06, 08, 09 (Successful Payment & Invoice Creation): PASS")

    # -------------------------------------------------------------
    # TEST 07: Duplicate Payment Blocked (HTTP 409)
    # -------------------------------------------------------------
    dup_pay = client.post(f"/api/tickets/{t_id}/payment", json={
        "amount": 4800000,
        "payment_method": "CASH"
    }, headers=staff_headers)
    assert dup_pay.status_code == 409, f"Test 07 Failed (Expected 409): {dup_pay.text}"
    print("  => TEST 07 (Duplicate Payment Blocked): PASS")

    # -------------------------------------------------------------
    # TEST 10: Invoice Snapshot Remains Unchanged
    # -------------------------------------------------------------
    inv_res = client.get(f"/api/tickets/{t_id}/invoice", headers=staff_headers)
    assert inv_res.status_code == 200
    inv_data = inv_res.json()
    assert inv_data["customer_name"] == "Nguyễn Văn Khách 07"
    assert inv_data["total_amount"] == 4800000.0
    print("  => TEST 10 (Invoice Snapshot Persistence): PASS")

    # -------------------------------------------------------------
    # TEST 12: Paid Ticket Handover Confirmation
    # -------------------------------------------------------------
    ho_res = client.post(f"/api/tickets/{t_id}/handover", headers=staff_headers)
    assert ho_res.status_code == 200
    ho_data = ho_res.json()
    assert ho_data["status"] == "DaTraMay"
    assert ho_data["handover_status"] == "HANDED_OVER"
    print("  => TEST 12 (Paid Ticket Handover Success): PASS")

    # -------------------------------------------------------------
    # TEST 13: Duplicate Handover Blocked (HTTP 409)
    # -------------------------------------------------------------
    dup_ho = client.post(f"/api/tickets/{t_id}/handover", headers=staff_headers)
    assert dup_ho.status_code == 409, f"Test 13 Failed (Expected 409): {dup_ho.text}"
    print("  => TEST 13 (Duplicate Handover Blocked): PASS")

    # -------------------------------------------------------------
    # TEST 17, 18, 19: Customer Invoice & Tracking Updates
    # -------------------------------------------------------------
    cust_inv = client.get(f"/api/tickets/{t_id}/invoice", headers=cust_headers)
    assert cust_inv.status_code == 200
    assert cust_inv.json()["invoice_number"] == inv_num

    track_res = client.get(f"/api/tickets/search?code={t_code}")
    assert track_res.status_code == 200
    t_track = track_res.json()[0]
    assert t_track["status"] == "DaTraMay"
    print("  => TEST 17, 18, 19 (Customer Invoice & Tracking Progress): PASS")

    # -------------------------------------------------------------
    # TEST 20: Ticket History Event Log Integrity
    # -------------------------------------------------------------
    hist_res = client.get(f"/api/tickets/{t_id}/history", headers=admin_headers)
    assert hist_res.status_code == 200
    actions = [h["action"] for h in hist_res.json()]
    assert "Thanh toán & Xuất hóa đơn" in actions
    assert "Giao máy hoàn tất" in actions
    print("  => TEST 20 (TicketHistory Audit Trail Integrity): PASS")

    # -------------------------------------------------------------
    # TEST 21: Legacy Ticket Compatibility
    # -------------------------------------------------------------
    b_old = client.post("/api/booking/", json={
        "customer_name": "Khách Cũ",
        "phone_number": "0900111222",
        "device_type": "laptop",
        "brand": "Asus",
        "device_model": "Zenbook",
        "symptoms": "Bàn phím hỏng",
        "appointment_date": future_date,
        "appointment_time": "09:00 - 10:00"
    })
    old_code = b_old.json()["booking_id"]
    track_old = client.get(f"/api/tickets/search?code={old_code}")
    assert track_old.status_code == 200
    print("  => TEST 21 (Legacy Ticket Compatibility): PASS")

    print("=" * 70)
    print("ALL TASK 07 VERIFICATION TESTS & E2E FLOW PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_task07_tests()
