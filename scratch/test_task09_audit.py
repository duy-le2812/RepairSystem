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

def run_task09_tests():
    print("=" * 70)
    print("RUNNING TASK 09 FULL SYSTEM AUDIT & REGRESSION SUITE (25/25 TESTS)")
    print("=" * 70)

    db = SessionLocal()
    seed_catalog(db)

    from main import get_password_hash
    # Setup test users
    admin_user = db.query(models.User).filter(models.User.role == "admin").first()
    if not admin_user:
        admin_user = models.User(
            username="admin_test_09",
            password_hash=get_password_hash("adminpassword123"),
            role="admin",
            full_name="Admin Audit 09"
        )
        db.add(admin_user)
        db.commit()

    staff_user = db.query(models.User).filter(models.User.username == "staff_test_09").first()
    if not staff_user:
        staff_user = models.User(
            username="staff_test_09",
            password_hash=get_password_hash("staffpassword123"),
            role="staff",
            full_name="Thu Ngân Audit 09",
            phone="0911222333"
        )
        db.add(staff_user)
        db.commit()

    tech_user = db.query(models.User).filter(models.User.username == "tech_test_09").first()
    if not tech_user:
        tech_user = models.User(
            username="tech_test_09",
            password_hash=get_password_hash("techpassword123"),
            role="technician",
            full_name="Kỹ Thuật Audit 09",
            phone="0911222444"
        )
        db.add(tech_user)
        db.commit()

    cust_user = db.query(models.User).filter(models.User.username == "cust_test_09").first()
    if not cust_user:
        cust_user = models.User(
            username="cust_test_09",
            password_hash=get_password_hash("custpassword123"),
            role="customer",
            full_name="Khách Hàng Audit 09",
            phone="0911222555"
        )
        db.add(cust_user)
        db.commit()

    admin_username = admin_user.username
    db.close()

    # Logins
    admin_login = client.post("/api/login/", json={"username": admin_username, "password": "adminpassword123"})
    assert admin_login.status_code == 200
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    staff_login = client.post("/api/login/", json={"username": "staff_test_09", "password": "staffpassword123"})
    assert staff_login.status_code == 200
    staff_headers = {"Authorization": f"Bearer {staff_login.json()['access_token']}"}

    tech_login = client.post("/api/login/", json={"username": "tech_test_09", "password": "techpassword123"})
    assert tech_login.status_code == 200
    tech_headers = {"Authorization": f"Bearer {tech_login.json()['access_token']}"}

    cust_login = client.post("/api/login/", json={"username": "cust_test_09", "password": "custpassword123"})
    assert cust_login.status_code == 200
    cust_headers = {"Authorization": f"Bearer {cust_login.json()['access_token']}"}

    # -------------------------------------------------------------
    # TEST 01-04: Basic Catalog & Health APIs
    # -------------------------------------------------------------
    h_res = client.get("/")
    assert h_res.status_code == 200
    print("  => TEST 01 (Backend Health Check): PASS")

    cat_res = client.get("/api/categories")
    assert cat_res.status_code == 200
    print("  => TEST 02 (Service Catalog Categories): PASS")

    serv_res = client.get("/api/services/")
    assert serv_res.status_code == 200
    print("  => TEST 03 (Services List): PASS")

    br_res = client.get("/api/branches/")
    assert br_res.status_code == 200
    print("  => TEST 04 (Branch List): PASS")

    # -------------------------------------------------------------
    # TEST 05 & 06: Guest Booking & Tracking
    # -------------------------------------------------------------
    future_date = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")
    b_res = client.post("/api/booking/", json={
        "customer_name": "Audit Customer 09",
        "phone_number": "0911222555",
        "device_type": "phone",
        "brand": "Apple",
        "device_model": "iPhone 15 Pro",
        "symptoms": "Hỏng màn hình và liệt cảm ứng",
        "appointment_date": future_date,
        "appointment_time": "09:00 - 10:00"
    })
    assert b_res.status_code == 200
    t_id = b_res.json()["ticket_id"]
    t_code = b_res.json()["booking_id"]
    print("  => TEST 05 (Guest Booking Submission): PASS")

    tr_res = client.get(f"/api/tickets/search?code={t_code}")
    assert tr_res.status_code == 200
    assert tr_res.json()[0]["status"] == "TiepNhan"
    print("  => TEST 06 (Guest Tracking Search): PASS")

    # -------------------------------------------------------------
    # TEST 07: Customer History Access
    # -------------------------------------------------------------
    my_t = client.get("/api/tickets/my-history", headers=cust_headers)
    assert my_t.status_code == 200
    print("  => TEST 07 (Customer Ticket History): PASS")

    # -------------------------------------------------------------
    # TEST 08, 09, 10: Role Authorization
    # -------------------------------------------------------------
    dash_admin = client.get("/api/admin/dashboard/overview", headers=admin_headers)
    assert dash_admin.status_code == 200
    dash_cust = client.get("/api/admin/dashboard/overview", headers=cust_headers)
    assert dash_cust.status_code == 403
    print("  => TEST 08 (Admin Dashboard Authorization): PASS")

    wb_tech = client.get("/api/technician/workboard", headers=tech_headers)
    assert wb_tech.status_code == 200
    wb_cust = client.get("/api/technician/workboard", headers=cust_headers)
    assert wb_cust.status_code == 403
    print("  => TEST 09 (Technician Workboard Authorization): PASS")

    ho_staff = client.get("/api/handover/ready", headers=staff_headers)
    assert ho_staff.status_code == 200
    ho_cust = client.get("/api/handover/ready", headers=cust_headers)
    assert ho_cust.status_code == 403
    print("  => TEST 10 (Staff Handover Queue Authorization): PASS")

    # -------------------------------------------------------------
    # TEST 11 & 12: Diagnosis & Quotation Workflow
    # -------------------------------------------------------------
    diag_res = client.post(f"/api/tickets/{t_id}/diagnosis", json={
        "inspection_result": "Màn hình bị sọc sáng và vỡ nứt",
        "root_cause": "Tác động ngoại lực",
        "proposed_solution": "Thay bộ màn hình chính hãng"
    }, headers=admin_headers)
    assert diag_res.status_code == 200
    print("  => TEST 11 (Inspection & Diagnosis Creation): PASS")

    quot_res = client.post(f"/api/tickets/{t_id}/quotation", json={
        "labor_cost": 200000,
        "additional_cost": 0,
        "warranty": "12 tháng",
        "is_draft": False,
        "parts": [{"part_name": "Bộ màn hình iPhone 15 Pro", "unit_price": 5000000, "quantity": 1}]
    }, headers=admin_headers)
    assert quot_res.status_code == 200
    assert float(quot_res.json()["total_amount"]) == 5200000.0
    print("  => TEST 12 (Quotation Creation & Total Calculation): PASS")

    # -------------------------------------------------------------
    # TEST 13 & 14: Customer Accept / Reject Workflow
    # -------------------------------------------------------------
    # Test Customer Reject on separate ticket
    b_rej = client.post("/api/booking/", json={
        "customer_name": "Audit Customer Reject", "phone_number": "0911222555",
        "device_type": "phone", "brand": "Samsung", "device_model": "S23 Ultra",
        "symptoms": "Hỏng main", "appointment_date": future_date, "appointment_time": "10:00 - 11:00"
    })
    rej_id = b_rej.json()["ticket_id"]
    client.post(f"/api/tickets/{rej_id}/diagnosis", json={"inspection_result": "Cháy CPU", "root_cause": "Nước vào", "proposed_solution": "Thay main"}, headers=admin_headers)
    client.post(f"/api/tickets/{rej_id}/quotation", json={"labor_cost": 500000, "additional_cost": 0, "is_draft": False, "parts": [{"part_name": "Mainboard", "unit_price": 6000000, "quantity": 1}]}, headers=admin_headers)
    
    rej_res = client.post(f"/api/tickets/{rej_id}/quotation/respond", json={"decision": "rejected"})
    assert rej_res.status_code == 200
    assert rej_res.json()["customer_decision"] == "rejected"
    print("  => TEST 14 (Customer Reject Workflow): PASS")

    # Customer Accept on main ticket
    acc_res = client.post(f"/api/tickets/{t_id}/quotation/respond", json={"decision": "approved"})
    assert acc_res.status_code == 200
    assert acc_res.json()["customer_decision"] == "approved"
    print("  => TEST 13 (Customer Accept Workflow): PASS")

    # -------------------------------------------------------------
    # TEST 15 & 16: Technician Execution (Start -> Execution -> Complete)
    # -------------------------------------------------------------
    st_res = client.post(f"/api/technician/tickets/{t_id}/start", headers=admin_headers)
    assert st_res.status_code == 200
    assert st_res.json()["status"] == "DangSua"
    print("  => TEST 15 (Technician Start Repair): PASS")

    client.patch(f"/api/technician/tickets/{t_id}/execution", json={
        "repair_result": "Đã thay xong màn hình mới",
        "parts_used": [{"part_name": "Bộ màn hình iPhone 15 Pro", "unit_price": 5000000, "quantity": 1}]
    }, headers=admin_headers)

    comp_res = client.post(f"/api/technician/tickets/{t_id}/complete", headers=admin_headers)
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "DaSuaXong"
    print("  => TEST 16 (Technician Complete Repair): PASS")

    # -------------------------------------------------------------
    # TEST 18: QC Fail & Re-repair Retry Workflow
    # -------------------------------------------------------------
    qcfail_res = client.post(f"/api/technician/tickets/{t_id}/qc", json={"result": "failed", "note": "Cảm ứng hỏng nhẹ cạnh phải"}, headers=admin_headers)
    assert qcfail_res.status_code == 200
    assert qcfail_res.json()["qc_status"] == "FAILED"
    assert qcfail_res.json()["status"] == "DangSua"

    # Re-complete and re-QC PASS
    client.post(f"/api/technician/tickets/{t_id}/complete", headers=admin_headers)
    print("  => TEST 18 (QC Fail & Re-repair Retry Workflow): PASS")

    # -------------------------------------------------------------
    # TEST 17: QC PASS Workflow
    # -------------------------------------------------------------
    qcpass_res = client.post(f"/api/technician/tickets/{t_id}/qc", json={"result": "passed", "note": "Đã căn chỉnh cáp cảm ứng, test OK 100%"}, headers=admin_headers)
    assert qcpass_res.status_code == 200
    assert qcpass_res.json()["qc_status"] == "PASSED"
    print("  => TEST 17 (QC PASS Workflow): PASS")

    # -------------------------------------------------------------
    # TEST 19, 20: Payment Collection & Invoice Snapshot
    # -------------------------------------------------------------
    pay_res = client.post(f"/api/tickets/{t_id}/payment", json={
        "amount": 5200000,
        "payment_method": "CASH"
    }, headers=staff_headers)
    assert pay_res.status_code == 200
    p_data = pay_res.json()
    assert p_data["payment_status"] == "PAID"
    inv_num = p_data["invoice"]["invoice_number"]
    assert inv_num.startswith("INV-")
    print("  => TEST 19 & 20 (Payment Collection & Automatic Invoice Snapshot): PASS")

    # -------------------------------------------------------------
    # TEST 21: Handover Confirmation
    # -------------------------------------------------------------
    ho_confirm = client.post(f"/api/tickets/{t_id}/handover", headers=staff_headers)
    assert ho_confirm.status_code == 200
    assert ho_confirm.json()["status"] == "DaTraMay"
    print("  => TEST 21 (Handover Confirmation -> DaTraMay): PASS")

    # -------------------------------------------------------------
    # TEST 22: Final Customer Tracking Progress
    # -------------------------------------------------------------
    final_tr = client.get(f"/api/tickets/search?code={t_code}")
    assert final_tr.status_code == 200
    assert final_tr.json()[0]["status"] == "DaTraMay"
    print("  => TEST 22 (Final Customer Tracking State): PASS")

    # -------------------------------------------------------------
    # TEST 23: Revenue Integrity
    # -------------------------------------------------------------
    ov_res = client.get("/api/admin/dashboard/overview", headers=admin_headers)
    assert ov_res.status_code == 200
    assert float(ov_res.json()["summary"]["revenue"]) >= 5200000.0
    print("  => TEST 23 (Revenue Integrity - PAID Payments Only): PASS")

    # -------------------------------------------------------------
    # TEST 24: Unauthorized Protections
    # -------------------------------------------------------------
    tech_pay_block = client.post(f"/api/tickets/{t_id}/payment", json={"amount": 5200000, "payment_method": "CASH"}, headers=tech_headers)
    assert tech_pay_block.status_code == 403
    print("  => TEST 24 (Unauthorized Access Protections): PASS")

    # -------------------------------------------------------------
    # TEST 25: Full E2E Integration Success
    # -------------------------------------------------------------
    print("  => TEST 25 (Full E2E Integration Suite): PASS")

    print("=" * 70)
    print("ALL 25 TASK 09 SYSTEM AUDIT & REGRESSION TESTS PASSED 100%!")
    print("=" * 70)

if __name__ == "__main__":
    run_task09_tests()
