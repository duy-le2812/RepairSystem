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

def run_task03_tests():
    print("=" * 70)
    print("RUNNING TASK 03 SERVICE CATALOG VERIFICATION TESTS (17 TESTS)")
    print("=" * 70)

    db = SessionLocal()

    # Get or create admin user for authentication
    admin_user = db.query(models.User).filter(models.User.role == "admin").first()
    if not admin_user:
        from main import get_password_hash
        admin_user = models.User(
            username="admin_test_03",
            password_hash=get_password_hash("adminpassword123"),
            role="admin",
            full_name="Admin Test 03"
        )
        db.add(admin_user)
        db.commit()
        admin_username = "admin_test_03"
    else:
        from main import get_password_hash
        admin_user.password_hash = get_password_hash("adminpassword123")
        db.commit()
        admin_username = admin_user.username

    # Record initial counts
    service_count_before = db.query(models.Service).count()
    ticket_count_before = db.query(models.RepairTicket).count()
    ticket_detail_count_before = db.query(models.TicketDetail).count()

    db.close()

    # Login Admin
    login_res = client.post("/api/login/", json={"username": admin_username, "password": "adminpassword123"})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # -------------------------------------------------------------
    # TEST 01 — Category Creation
    # -------------------------------------------------------------
    cat_payload = {
        "name": "Tai nghe TEST",
        "slug": "tai-nghe-test",
        "description": "Tai nghe nhét tai và chụp tai"
    }
    res01 = client.post("/api/admin/categories", json=cat_payload, headers=headers)
    assert res01.status_code == 200, f"Test 01 Failed: {res01.text}"
    cat_data = res01.json()
    cat_id = cat_data["id"]
    assert cat_data["name"] == "Tai nghe TEST"
    print("  => TEST 01 (Category Creation): PASS")

    # -------------------------------------------------------------
    # TEST 02 — Duplicate Category
    # -------------------------------------------------------------
    res02 = client.post("/api/admin/categories", json=cat_payload, headers=headers)
    assert res02.status_code == 400, f"Test 02 Failed (Expected 400): {res02.text}"
    print("  => TEST 02 (Duplicate Category): PASS")

    # -------------------------------------------------------------
    # TEST 03 — Brand Creation
    # -------------------------------------------------------------
    brand_payload = {
        "category_id": cat_id,
        "name": "Sony TEST",
        "slug": "sony-test",
        "description": "Thương hiệu Sony"
    }
    res03 = client.post("/api/admin/brands", json=brand_payload, headers=headers)
    assert res03.status_code == 200, f"Test 03 Failed: {res03.text}"
    brand_data = res03.json()
    brand_id = brand_data["id"]
    assert brand_data["name"] == "Sony TEST"
    print("  => TEST 03 (Brand Creation): PASS")

    # -------------------------------------------------------------
    # TEST 04 — Invalid Brand Parent
    # -------------------------------------------------------------
    invalid_brand_payload = {
        "category_id": 999999,
        "name": "Invalid Brand",
        "slug": "invalid-brand"
    }
    res04 = client.post("/api/admin/brands", json=invalid_brand_payload, headers=headers)
    assert res04.status_code == 400, f"Test 04 Failed: {res04.text}"
    print("  => TEST 04 (Invalid Brand Parent): PASS")

    # -------------------------------------------------------------
    # TEST 05 — Model Creation
    # -------------------------------------------------------------
    model_payload = {
        "brand_id": brand_id,
        "name": "WH-1000XM5 TEST",
        "slug": "wh-1000xm5-test",
        "description": "Tai nghe chống ồn Sony"
    }
    res05 = client.post("/api/admin/models", json=model_payload, headers=headers)
    assert res05.status_code == 200, f"Test 05 Failed: {res05.text}"
    model_data = res05.json()
    model_id = model_data["id"]
    assert model_data["name"] == "WH-1000XM5 TEST"
    print("  => TEST 05 (Model Creation): PASS")

    # -------------------------------------------------------------
    # TEST 06 — Invalid Model Parent
    # -------------------------------------------------------------
    invalid_model_payload = {
        "brand_id": 999999,
        "name": "Invalid Model",
        "slug": "invalid-model"
    }
    res06 = client.post("/api/admin/models", json=invalid_model_payload, headers=headers)
    assert res06.status_code == 400, f"Test 06 Failed: {res06.text}"
    print("  => TEST 06 (Invalid Model Parent): PASS")

    # -------------------------------------------------------------
    # TEST 07 — Service Creation
    # -------------------------------------------------------------
    svc_payload = {
        "service_name": "Thay pin tai nghe Sony WH-1000XM5 TEST",
        "description": "Thay pin tai nghe Sony chuyên dụng",
        "base_price": 450000,
        "model_id": model_id,
        "estimated_duration_minutes": 45,
        "warranty_months": 6
    }
    res07 = client.post("/api/services/", json=svc_payload, headers=headers)
    assert res07.status_code == 200, f"Test 07 Failed: {res07.text}"
    svc_data = res07.json()
    svc_id = svc_data["id"]
    assert svc_data["model_id"] == model_id
    assert svc_data["estimated_duration_minutes"] == 45
    assert svc_data["warranty_months"] == 6
    print("  => TEST 07 (Service Creation): PASS")

    # -------------------------------------------------------------
    # TEST 08 — Hierarchy API
    # -------------------------------------------------------------
    # Step 1: GET Categories
    res08_cat = client.get("/api/categories")
    assert res08_cat.status_code == 200
    cats = res08_cat.json()
    matched_cat = next((c for c in cats if c["id"] == cat_id), None)
    assert matched_cat is not None

    # Step 2: GET Brands by Category
    res08_brand = client.get(f"/api/categories/{cat_id}/brands")
    assert res08_brand.status_code == 200
    brands = res08_brand.json()
    assert len(brands) == 1
    assert brands[0]["id"] == brand_id

    # Step 3: GET Models by Brand
    res08_model = client.get(f"/api/brands/{brand_id}/models")
    assert res08_model.status_code == 200
    models_list = res08_model.json()
    assert len(models_list) == 1
    assert models_list[0]["id"] == model_id

    # Step 4: GET Services by Model
    res08_svc = client.get(f"/api/models/{model_id}/services")
    assert res08_svc.status_code == 200
    svcs = res08_svc.json()
    assert len(svcs) == 1
    assert svcs[0]["id"] == svc_id
    print("  => TEST 08 (Hierarchy API): PASS")

    # -------------------------------------------------------------
    # TEST 09 — Service Detail
    # -------------------------------------------------------------
    res09 = client.get(f"/api/services/{svc_id}")
    assert res09.status_code == 200
    s_detail = res09.json()
    assert s_detail["id"] == svc_id
    assert s_detail["model"]["name"] == "WH-1000XM5 TEST"
    assert s_detail["brand"]["name"] == "Sony TEST"
    assert s_detail["category"]["name"] == "Tai nghe TEST"
    print("  => TEST 09 (Service Detail): PASS")

    # -------------------------------------------------------------
    # TEST 10 — Active / Inactive Soft Delete
    # -------------------------------------------------------------
    res10_del = client.delete(f"/api/services/{svc_id}", headers=headers)
    assert res10_del.status_code == 200
    
    # Public catalog endpoint should NOT return inactive service
    res10_cat = client.get(f"/api/models/{model_id}/services")
    assert res10_cat.status_code == 200
    assert len(res10_cat.json()) == 0

    # Detail API still accessible for historical records
    res10_det = client.get(f"/api/services/{svc_id}")
    assert res10_det.status_code == 200
    assert res10_det.json()["is_active"] == False
    print("  => TEST 10 (Active / Inactive Soft Delete): PASS")

    # Reactivate service for further testing
    res10_react = client.put(f"/api/services/{svc_id}", json={"is_active": True}, headers=headers)
    assert res10_react.status_code == 200

    # -------------------------------------------------------------
    # TEST 11 — Existing Service Compatibility
    # -------------------------------------------------------------
    db = SessionLocal()
    service_count_after = db.query(models.Service).count()
    assert service_count_after >= service_count_before
    db.close()
    print("  => TEST 11 (Existing Service Compatibility): PASS")

    # -------------------------------------------------------------
    # TEST 12 — Existing Ticket Compatibility
    # -------------------------------------------------------------
    db = SessionLocal()
    ticket_count_after = db.query(models.RepairTicket).count()
    ticket_detail_count_after = db.query(models.TicketDetail).count()
    assert ticket_count_after >= ticket_count_before
    assert ticket_detail_count_after >= ticket_detail_count_before
    db.close()
    print("  => TEST 12 (Existing Ticket Compatibility): PASS")

    # -------------------------------------------------------------
    # TEST 13 — Booking Regression
    # -------------------------------------------------------------
    future_date = (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%d")
    booking_res = client.post("/api/booking/", json={
        "customer_name": "Booking Regression User",
        "phone_number": "0912345678",
        "device_type": "phone",
        "brand": "Apple",
        "device_model": "iPhone 14 Pro",
        "symptoms": "Kiểm tra màn hình sau Task 03",
        "appointment_date": future_date,
        "appointment_time": "10:00 - 12:00"
    })
    assert booking_res.status_code == 200
    b_order_id = booking_res.json()["booking_id"]
    print("  => TEST 13 (Booking Regression): PASS")

    # -------------------------------------------------------------
    # TEST 14 — Tracking Regression
    # -------------------------------------------------------------
    track_res = client.get(f"/api/tickets/search?code={b_order_id}")
    assert track_res.status_code == 200
    assert len(track_res.json()) == 1
    print("  => TEST 14 (Tracking Regression): PASS")

    # -------------------------------------------------------------
    # TEST 15 — Repair Workflow Regression
    # -------------------------------------------------------------
    ticket_num_id = int(b_order_id.replace("FIX-", ""))
    wf_res = client.put(f"/api/tickets/{ticket_num_id}/status?new_status=DangKiemTra", headers=headers)
    assert wf_res.status_code == 200
    print("  => TEST 15 (Repair Workflow Regression): PASS")

    # -------------------------------------------------------------
    # TEST 16 — Seed Idempotency
    # -------------------------------------------------------------
    db = SessionLocal()
    cat_count_before = db.query(models.Category).count()
    brand_count_before = db.query(models.Brand).count()
    model_count_before = db.query(models.DeviceModel).count()
    
    # Run seed 3 times
    seed_catalog(db)
    seed_catalog(db)
    seed_catalog(db)

    cat_count_after = db.query(models.Category).count()
    brand_count_after = db.query(models.Brand).count()
    model_count_after = db.query(models.DeviceModel).count()
    
    assert cat_count_before == cat_count_after
    assert brand_count_before == brand_count_after
    assert model_count_before == model_count_after
    db.close()
    print("  => TEST 16 (Seed Idempotency): PASS")

    # -------------------------------------------------------------
    # TEST 17 — Data Integrity
    # -------------------------------------------------------------
    db = SessionLocal()
    # Verify no orphan Brands
    all_brands = db.query(models.Brand).all()
    for b in all_brands:
        cat_obj = db.query(models.Category).filter(models.Category.id == b.category_id).first()
        assert cat_obj is not None, f"Orphan brand found: {b.id}"

    # Verify no orphan DeviceModels
    all_models = db.query(models.DeviceModel).all()
    for m in all_models:
        brand_obj = db.query(models.Brand).filter(models.Brand.id == m.brand_id).first()
        assert brand_obj is not None, f"Orphan model found: {m.id}"

    # Verify no orphan Services with model_id
    all_services = db.query(models.Service).all()
    for s in all_services:
        if s.model_id is not None:
            m_obj = db.query(models.DeviceModel).filter(models.DeviceModel.id == s.model_id).first()
            assert m_obj is not None, f"Orphan service model_id found: {s.id}"

    db.close()
    print("  => TEST 17 (Data Integrity - No Orphan FKs): PASS")

    print("=" * 70)
    print("ALL 17 TASK 03 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_task03_tests()
