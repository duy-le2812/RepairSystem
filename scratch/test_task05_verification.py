import sys
import os
from datetime import datetime, timedelta

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from fastapi.testclient import TestClient
from main import app, get_db
from database import Base, engine, SessionLocal
import models, schemas

client = TestClient(app)

def run_task05_tests():
    print("=" * 70)
    print("RUNNING TASK 05 DIAGNOSIS & QUOTATION WORKFLOW VERIFICATION TESTS")
    print("=" * 70)

    db = SessionLocal()

    # Get or create admin user for authentication
    from main import get_password_hash
    admin_user = db.query(models.User).filter(models.User.role == "admin").first()
    if not admin_user:
        admin_user = models.User(
            username="admin_test_05",
            password_hash=get_password_hash("adminpassword123"),
            role="admin",
            full_name="Admin Test 05"
        )
        db.add(admin_user)
        db.commit()
        admin_username = "admin_test_05"
    else:
        admin_user.password_hash = get_password_hash("adminpassword123")
        db.commit()
        admin_username = admin_user.username

    # Create a regular customer user
    customer_user = db.query(models.User).filter(models.User.username == "customer_test_05").first()
    if not customer_user:
        customer_user = models.User(
            username="customer_test_05",
            password_hash=get_password_hash("custpassword123"),
            role="customer",
            full_name="Khách Hàng Test 05",
            phone="0977112233"
        )
        db.add(customer_user)
        db.commit()

    db.close()

    # Login Admin
    login_admin_res = client.post("/api/login/", json={"username": admin_username, "password": "adminpassword123"})
    assert login_admin_res.status_code == 200, f"Admin login failed: {login_admin_res.text}"
    admin_token = login_admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Login Customer
    login_cust_res = client.post("/api/login/", json={"username": "customer_test_05", "password": "custpassword123"})
    assert login_cust_res.status_code == 200, f"Customer login failed: {login_cust_res.text}"
    cust_token = login_cust_res.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    # Create a booking to test
    future_date = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")
    booking_res = client.post("/api/booking/", json={
        "customer_name": "Nguyen Van Test 05",
        "phone_number": "0977112233",
        "device_type": "phone",
        "brand": "Apple",
        "device_model": "iPhone 14 Pro",
        "symptoms": "Màn hình sọc ngang, chớp giật",
        "appointment_date": future_date,
        "appointment_time": "09:00 - 10:00"
    })
    assert booking_res.status_code == 200, f"Booking failed: {booking_res.text}"
    booking_id_code = booking_res.json()["booking_id"]
    ticket_id = booking_res.json()["ticket_id"]

    # -------------------------------------------------------------
    # TEST 01: Create Diagnosis Successfully
    # -------------------------------------------------------------
    diag_payload = {
        "symptoms": "Màn hình sọc ngang, chớp giật",
        "inspection_result": "Màn hình OLED bị vỡ sọc ngang, pin dung lượng còn 84%",
        "root_cause": "Tấm nền màn hình va đập gây hỏng IC hiển thị",
        "proposed_solution": "Thay màn hình iPhone 14 Pro chính hãng"
    }
    diag_res = client.post(f"/api/tickets/{ticket_id}/diagnosis", json=diag_payload, headers=admin_headers)
    assert diag_res.status_code == 200, f"Test 01 Failed: {diag_res.text}"
    diag_data = diag_res.json()
    assert diag_data["inspection_result"] == diag_payload["inspection_result"]
    print("  => TEST 01 (Create Diagnosis): PASS")

    # -------------------------------------------------------------
    # TEST 02: Unauthorized Diagnosis & Validation
    # -------------------------------------------------------------
    # Customer trying to create diagnosis
    unauth_res = client.post(f"/api/tickets/{ticket_id}/diagnosis", json=diag_payload, headers=cust_headers)
    assert unauth_res.status_code == 403, f"Test 02 Failed (Expected 403): {unauth_res.text}"
    
    # Empty inspection result
    empty_diag_payload = {
        "inspection_result": "   ",
        "root_cause": "Cause",
        "proposed_solution": "Solution"
    }
    empty_res = client.post(f"/api/tickets/{ticket_id}/diagnosis", json=empty_diag_payload, headers=admin_headers)
    assert empty_res.status_code == 400, f"Test 02 Failed (Expected 400): {empty_res.text}"
    print("  => TEST 02 (Unauthorized Diagnosis & Empty Check): PASS")

    # -------------------------------------------------------------
    # TEST 03 & 04: Create Quotation & Check Calculation
    # -------------------------------------------------------------
    quote_payload = {
        "labor_cost": 300000,
        "additional_cost": 50000,
        "warranty": "12 tháng",
        "notes": "Bảo hành màn hình 12 tháng chính hãng",
        "is_draft": False,
        "parts": [
            {"part_name": "Màn hình OLED iPhone 14 Pro", "unit_price": 4500000, "quantity": 1}
        ]
    }
    quote_res = client.post(f"/api/tickets/{ticket_id}/quotation", json=quote_payload, headers=admin_headers)
    assert quote_res.status_code == 200, f"Test 03/04 Failed: {quote_res.text}"
    quote_data = quote_res.json()
    # Expected grand total: 4,500,000 + 300,000 + 50,000 = 4,850,000
    assert float(quote_data["total_amount"]) == 4850000
    print("  => TEST 03 & 04 (Create Quotation & Calculation): PASS")

    # -------------------------------------------------------------
    # TEST 05 & 06: Reject Negative Price & Negative Quantity
    # -------------------------------------------------------------
    neg_price_payload = {
        "labor_cost": 300000,
        "additional_cost": 0,
        "parts": [{"part_name": "Man hinh", "unit_price": -500, "quantity": 1}]
    }
    neg_price_res = client.post(f"/api/tickets/{ticket_id}/quotation", json=neg_price_payload, headers=admin_headers)
    assert neg_price_res.status_code in [400, 422], f"Test 05 Failed: {neg_price_res.text}"

    neg_qty_payload = {
        "labor_cost": 300000,
        "additional_cost": 0,
        "parts": [{"part_name": "Man hinh", "unit_price": 1000, "quantity": -2}]
    }
    neg_qty_res = client.post(f"/api/tickets/{ticket_id}/quotation", json=neg_qty_payload, headers=admin_headers)
    assert neg_qty_res.status_code in [400, 422], f"Test 06 Failed: {neg_qty_res.text}"
    print("  => TEST 05 & 06 (Negative Price & Quantity Validation): PASS")

    # -------------------------------------------------------------
    # TEST 07: Draft Quotation Visibility to Customer
    # -------------------------------------------------------------
    # Save a draft quotation
    draft_payload = {
        "labor_cost": 200000,
        "additional_cost": 0,
        "is_draft": True,
        "parts": [{"part_name": "Khung may", "unit_price": 500000, "quantity": 1}]
    }
    draft_res = client.post(f"/api/tickets/{ticket_id}/quotation", json=draft_payload, headers=admin_headers)
    assert draft_res.status_code == 200
    assert draft_res.json()["customer_decision"] == "draft"

    # Customer tracks ticket -> quotation must be NULL
    track_draft_res = client.get(f"/api/tickets/search?code={booking_id_code}")
    assert track_draft_res.status_code == 200
    assert track_draft_res.json()[0]["quotation"] is None
    print("  => TEST 07 (Draft Quotation Invisible to Customer): PASS")

    # -------------------------------------------------------------
    # TEST 08 & 09: Send Quotation -> PENDING_CUSTOMER & Tracking Visibility
    # -------------------------------------------------------------
    send_payload = {
        "labor_cost": 300000,
        "additional_cost": 0,
        "warranty": "12 tháng",
        "is_draft": False,
        "parts": [{"part_name": "Màn hình iPhone 14 Pro", "unit_price": 4500000, "quantity": 1}]
    }
    send_res = client.post(f"/api/tickets/{ticket_id}/quotation", json=send_payload, headers=admin_headers)
    assert send_res.status_code == 200
    assert send_res.json()["customer_decision"] == "pending"

    # Customer tracks ticket -> quotation visible and status pending
    track_pub_res = client.get(f"/api/tickets/search?code={booking_id_code}")
    assert track_pub_res.status_code == 200
    track_order = track_pub_res.json()[0]
    assert track_order["quotation"] is not None
    assert track_order["quotation"]["customer_decision"] == "pending"
    assert track_order["diagnosis"] is not None
    print("  => TEST 08 & 09 (Send Quotation & Customer Tracking): PASS")

    # -------------------------------------------------------------
    # TEST 10: Customer Accepts Quotation
    # -------------------------------------------------------------
    resp_accept = client.post(f"/api/tickets/{ticket_id}/quotation/respond", json={"decision": "approved"})
    assert resp_accept.status_code == 200
    assert resp_accept.json()["customer_decision"] == "approved"
    print("  => TEST 10 (Customer Accept Quotation): PASS")

    # -------------------------------------------------------------
    # TEST 13: Cannot Reject Accepted Quotation
    # -------------------------------------------------------------
    double_reject = client.post(f"/api/tickets/{ticket_id}/quotation/respond", json={"decision": "rejected"})
    assert double_reject.status_code == 400, f"Test 13 Failed (Expected 400): {double_reject.text}"
    print("  => TEST 13 (Cannot Reject Accepted Quotation): PASS")

    # -------------------------------------------------------------
    # E2E REJECT FLOW TEST (Create new ticket -> Quotation -> Customer Rejects)
    # -------------------------------------------------------------
    b2_res = client.post("/api/booking/", json={
        "customer_name": "Customer Rejection Test",
        "phone_number": "0911223344",
        "device_type": "laptop",
        "brand": "Dell",
        "device_model": "XPS 13",
        "symptoms": "Nguồn không lên",
        "appointment_date": future_date,
        "appointment_time": "10:00 - 11:00"
    })
    t2_id = b2_res.json()["ticket_id"]
    t2_code = b2_res.json()["booking_id"]

    # Diagnosis & Quotation
    client.post(f"/api/tickets/{t2_id}/diagnosis", json={
        "inspection_result": "Mainboard chập nguồn",
        "root_cause": "Hỏng IC nguồn",
        "proposed_solution": "Sửa IC nguồn mainboard"
    }, headers=admin_headers)

    client.post(f"/api/tickets/{t2_id}/quotation", json={
        "labor_cost": 200000,
        "additional_cost": 0,
        "is_draft": False,
        "parts": [{"part_name": "IC Nguồn Dell XPS 13", "unit_price": 1200000, "quantity": 1}]
    }, headers=admin_headers)

    # TEST 11: Customer Rejects
    resp_reject = client.post(f"/api/tickets/{t2_id}/quotation/respond", json={
        "decision": "rejected",
        "rejection_reason": "Giá cao hơn dự kiến"
    })
    assert resp_reject.status_code == 200
    assert resp_reject.json()["customer_decision"] == "rejected"
    print("  => TEST 11 (Customer Reject Quotation): PASS")

    # TEST 12: Cannot Accept Rejected Quotation
    double_accept = client.post(f"/api/tickets/{t2_id}/quotation/respond", json={"decision": "approved"})
    assert double_accept.status_code == 400, f"Test 12 Failed (Expected 400): {double_accept.text}"
    print("  => TEST 12 (Cannot Accept Rejected Quotation): PASS")

    # -------------------------------------------------------------
    # TEST 14: Unauthorized Access to another customer ticket
    # -------------------------------------------------------------
    # Create ticket for customer_user (phone 0977112233)
    # Create another ticket for different phone 0900000000
    b3_res = client.post("/api/booking/", json={
        "customer_name": "Customer Secret",
        "phone_number": "0900000000",
        "device_type": "phone",
        "brand": "Samsung",
        "device_model": "Galaxy S24",
        "symptoms": "Pin phồng",
        "appointment_date": future_date,
        "appointment_time": "14:00 - 15:00"
    })
    t3_code = b3_res.json()["booking_id"]

    # Customer 0977112233 (cust_token) trying to query 0900000000
    unauth_track_res = client.get(f"/api/tickets/search?code={t3_code}", headers=cust_headers)
    assert unauth_track_res.status_code == 403, f"Test 14 Failed (Expected 403): {unauth_track_res.text}"
    print("  => TEST 14 (Unauthorized Customer Access Blocked): PASS")

    # -------------------------------------------------------------
    # TEST 15: Legacy Ticket Without Quotation Works Cleanly
    # -------------------------------------------------------------
    track_legacy = client.get(f"/api/tickets/search?code={t3_code}")
    assert track_legacy.status_code == 200
    legacy_order = track_legacy.json()[0]
    assert legacy_order["quotation"] is None
    print("  => TEST 15 (Legacy Ticket Without Quotation Compatibility): PASS")

    print("=" * 70)
    print("ALL TASK 05 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_task05_tests()
