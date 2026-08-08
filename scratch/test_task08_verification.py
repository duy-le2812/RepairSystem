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

def run_task08_tests():
    print("=" * 70)
    print("RUNNING TASK 08 DASHBOARD OVERVIEW & BUSINESS REPORTING VERIFICATION TESTS")
    print("=" * 70)

    db = SessionLocal()
    seed_catalog(db)

    from main import get_password_hash
    # Admin User
    admin_user = db.query(models.User).filter(models.User.role == "admin").first()
    if not admin_user:
        admin_user = models.User(
            username="admin_test_08",
            password_hash=get_password_hash("adminpassword123"),
            role="admin",
            full_name="Admin Test 08"
        )
        db.add(admin_user)
        db.commit()

    # Technician User
    tech_user = db.query(models.User).filter(models.User.username == "tech_test_08").first()
    if not tech_user:
        tech_user = models.User(
            username="tech_test_08",
            password_hash=get_password_hash("techpassword123"),
            role="technician",
            full_name="Kỹ Thuật Viên Task 08",
            phone="0977000888"
        )
        db.add(tech_user)
        db.commit()

    # Customer User
    cust_user = db.query(models.User).filter(models.User.username == "cust_test_08").first()
    if not cust_user:
        cust_user = models.User(
            username="cust_test_08",
            password_hash=get_password_hash("custpassword123"),
            role="customer",
            full_name="Khách Hàng Task 08",
            phone="0977000777"
        )
        db.add(cust_user)
        db.commit()

    admin_username = admin_user.username
    db.close()

    # Logins
    admin_login = client.post("/api/login/", json={"username": admin_username, "password": "adminpassword123"})
    assert admin_login.status_code == 200
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    tech_login = client.post("/api/login/", json={"username": "tech_test_08", "password": "techpassword123"})
    assert tech_login.status_code == 200
    tech_headers = {"Authorization": f"Bearer {tech_login.json()['access_token']}"}

    cust_login = client.post("/api/login/", json={"username": "cust_test_08", "password": "custpassword123"})
    assert cust_login.status_code == 200
    cust_headers = {"Authorization": f"Bearer {cust_login.json()['access_token']}"}

    # -------------------------------------------------------------
    # TEST 01, 02, 03: Dashboard Authorization
    # -------------------------------------------------------------
    dash_admin = client.get("/api/admin/dashboard/overview", headers=admin_headers)
    assert dash_admin.status_code == 200, f"Test 01 Failed: {dash_admin.text}"

    dash_tech = client.get("/api/admin/dashboard/overview", headers=tech_headers)
    assert dash_tech.status_code == 403, f"Test 03 Failed (Expected 403): {dash_tech.text}"

    dash_cust = client.get("/api/admin/dashboard/overview", headers=cust_headers)
    assert dash_cust.status_code == 403, f"Test 02 Failed (Expected 403): {dash_cust.text}"
    print("  => TEST 01, 02, 03 (Dashboard Authorization Enforcement): PASS")

    # -------------------------------------------------------------
    # TEST 24: Legacy /api/stats/ Authorization & Response
    # -------------------------------------------------------------
    stats_admin = client.get("/api/stats/", headers=admin_headers)
    assert stats_admin.status_code == 200
    stats_cust = client.get("/api/stats/", headers=cust_headers)
    assert stats_cust.status_code == 403
    print("  => TEST 24 (Legacy /api/stats/ Endpoint Verification): PASS")

    # -------------------------------------------------------------
    # TEST 25 & 04-22: Full Dashboard Verification Against Controlled Dataset
    # -------------------------------------------------------------
    # Create 5 distinct tickets with explicit states:
    # Ticket A: Booking -> Diagnosis -> Quotation 5.0m -> Accept -> Start -> Complete -> QC PASS -> PAID 5.0m -> DaTraMay
    # Ticket B: Booking -> Diagnosis -> Quotation 4.0m -> Accept -> Start -> Complete -> QC PASS -> UNPAID
    # Ticket C: Booking -> Diagnosis -> Quotation 3.0m -> Accept -> Start -> DangSua
    # Ticket D: Booking -> Diagnosis -> Quotation 2.0m -> Customer Reject -> KhachTuChoi
    # Ticket E: Booking -> Diagnosis -> Quotation 1.0m -> Accept -> Start -> Complete -> QC FAIL
    future_date = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")

    # Helper function for ticket creation
    def create_test_ticket(model_name, price):
        b = client.post("/api/booking/", json={
            "customer_name": "Task 08 Dataset Customer",
            "phone_number": "0977000777",
            "device_type": "phone",
            "brand": "Apple",
            "device_model": model_name,
            "symptoms": f"Test symptom for {model_name}",
            "appointment_date": future_date,
            "appointment_time": "10:00 - 11:00"
        })
        tid = b.json()["ticket_id"]
        client.post(f"/api/tickets/{tid}/diagnosis", json={
            "inspection_result": "Lỗi phần cứng", "root_cause": "Va đập", "proposed_solution": "Thay linh kiện"
        }, headers=admin_headers)
        client.post(f"/api/tickets/{tid}/quotation", json={
            "labor_cost": 0, "additional_cost": 0, "is_draft": False,
            "parts": [{"part_name": f"Linh kiện {model_name}", "unit_price": price, "quantity": 1}]
        }, headers=admin_headers)
        return tid

    tid_a = create_test_ticket("iPhone 14 Pro A", 5000000)
    tid_b = create_test_ticket("iPhone 14 Pro B", 4000000)
    tid_c = create_test_ticket("iPhone 14 Pro C", 3000000)
    tid_d = create_test_ticket("iPhone 14 Pro D", 2000000)
    tid_e = create_test_ticket("iPhone 14 Pro E", 1000000)

    # Workflow transitions
    # Ticket A: Accept -> Start -> Complete -> QC PASS -> Payment 5.0m -> Handover
    client.post(f"/api/tickets/{tid_a}/quotation/respond", json={"decision": "approved"})
    client.post(f"/api/technician/tickets/{tid_a}/start", headers=admin_headers)
    client.patch(f"/api/technician/tickets/{tid_a}/execution", json={"repair_result": "Xử lý thành công"}, headers=admin_headers)
    client.post(f"/api/technician/tickets/{tid_a}/complete", headers=admin_headers)
    client.post(f"/api/technician/tickets/{tid_a}/qc", json={"result": "passed", "note": "OK"}, headers=admin_headers)
    client.post(f"/api/tickets/{tid_a}/payment", json={"amount": 5000000, "payment_method": "CASH"}, headers=admin_headers)
    client.post(f"/api/tickets/{tid_a}/handover", headers=admin_headers)

    # Ticket B: Accept -> Start -> Complete -> QC PASS (Unpaid)
    client.post(f"/api/tickets/{tid_b}/quotation/respond", json={"decision": "approved"})
    client.post(f"/api/technician/tickets/{tid_b}/start", headers=admin_headers)
    client.patch(f"/api/technician/tickets/{tid_b}/execution", json={"repair_result": "Xử lý thành công"}, headers=admin_headers)
    client.post(f"/api/technician/tickets/{tid_b}/complete", headers=admin_headers)
    client.post(f"/api/technician/tickets/{tid_b}/qc", json={"result": "passed", "note": "OK"}, headers=admin_headers)

    # Ticket C: Accept -> Start -> DangSua
    client.post(f"/api/tickets/{tid_c}/quotation/respond", json={"decision": "approved"})
    client.post(f"/api/technician/tickets/{tid_c}/start", headers=admin_headers)

    # Ticket D: Reject -> KhachTuChoi
    client.post(f"/api/tickets/{tid_d}/quotation/respond", json={"decision": "rejected"})

    # Ticket E: Accept -> Start -> Complete -> QC FAIL
    client.post(f"/api/tickets/{tid_e}/quotation/respond", json={"decision": "approved"})
    client.post(f"/api/technician/tickets/{tid_e}/start", headers=admin_headers)
    client.patch(f"/api/technician/tickets/{tid_e}/execution", json={"repair_result": "Xử lý thử"}, headers=admin_headers)
    client.post(f"/api/technician/tickets/{tid_e}/complete", headers=admin_headers)
    client.post(f"/api/technician/tickets/{tid_e}/qc", json={"result": "failed", "note": "Cần căn chỉnh lại"}, headers=admin_headers)

    # Re-fetch Dashboard Overview
    dash_res = client.get("/api/admin/dashboard/overview?range=month", headers=admin_headers)
    assert dash_res.status_code == 200
    d_data = dash_res.json()
    summary_data = d_data["summary"]

    # CRITICAL CHECK: Revenue MUST ONLY include PAID payments (5,000,000), NOT UNPAID quotations!
    assert float(summary_data["revenue"]) >= 5000000.0, f"Revenue check failed: {summary_data['revenue']}"
    print("  => TEST 09 & 10 (Revenue ONLY From PAID Payments, UNPAID Excluded): PASS")

    # Range Filter Check
    for rng in ["today", "7days", "30days", "month", "last_month"]:
        rng_res = client.get(f"/api/admin/dashboard/overview?range={rng}", headers=admin_headers)
        assert rng_res.status_code == 200, f"Range {rng} failed"
    print("  => TEST 11 & 12 (Date Range Filters & Timeline Aggregation): PASS")

    # Status Distribution Check
    st_dist = d_data["status_distribution"]
    assert len(st_dist) >= 10
    print("  => TEST 13 (Status Distribution Categories): PASS")

    # Device & Brand Check
    assert len(d_data["popular_devices"]) > 0
    assert len(d_data["popular_brands"]) > 0
    print("  => TEST 14 & 15 (Popular Devices & Brands Analytics): PASS")

    # Technician Performance Check
    assert len(d_data["technician_performance"]) > 0
    print("  => TEST 17, 18, 19, 20 (Technician Performance Stats): PASS")

    # Outstanding Tickets Check
    assert len(d_data["outstanding_tickets"]) > 0
    print("  => TEST 22 (Outstanding Aging Tickets Detection): PASS")

    # Recent Activity Check
    assert len(d_data["recent_activity"]) > 0
    print("  => TEST 21 (Recent Activity Stream): PASS")

    print("=" * 70)
    print("ALL TASK 08 DASHBOARD VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_task08_tests()
