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

def run_task04_tests():
    print("=" * 70)
    print("RUNNING TASK 04 FRONTEND & BACKEND INTEGRATION TESTS")
    print("=" * 70)

    db = SessionLocal()
    seed_catalog(db)
    
    # Get a sample active category, brand, model, and service
    cat = db.query(models.Category).filter(models.Category.is_active == True).first()
    assert cat is not None, "Category seed missing!"
    
    brand = db.query(models.Brand).filter(models.Brand.category_id == cat.id, models.Brand.is_active == True).first()
    assert brand is not None, "Brand seed missing!"
    
    dev_model = db.query(models.DeviceModel).filter(models.DeviceModel.brand_id == brand.id, models.DeviceModel.is_active == True).first()
    assert dev_model is not None, "Model seed missing!"
    
    svc = db.query(models.Service).filter(models.Service.model_id == dev_model.id, models.Service.is_active == True).first()
    assert svc is not None, "Service seed missing!"
    
    cat_id = cat.id
    brand_id = brand.id
    model_id = dev_model.id
    svc_id = svc.id

    db.close()

    # 1. TEST 01: Catalog Load (/api/categories)
    res1 = client.get("/api/categories")
    assert res1.status_code == 200
    cats_data = res1.json()
    assert len(cats_data) >= 1
    print("  => TEST 01 (Catalog Load): PASS")

    # 2. TEST 02: Category Selection (/api/categories/{id}/brands)
    res2 = client.get(f"/api/categories/{cat_id}/brands")
    assert res2.status_code == 200
    brands_data = res2.json()
    assert len(brands_data) >= 1
    assert any(b["id"] == brand_id for b in brands_data)
    print("  => TEST 02 (Category Selection): PASS")

    # 3. TEST 03: Brand Selection (/api/brands/{id}/models)
    res3 = client.get(f"/api/brands/{brand_id}/models")
    assert res3.status_code == 200
    models_data = res3.json()
    assert len(models_data) >= 1
    assert any(m["id"] == model_id for m in models_data)
    print("  => TEST 03 (Brand Selection): PASS")

    # 4. TEST 04: Model Selection (/api/models/{id}/services)
    res4 = client.get(f"/api/models/{model_id}/services")
    assert res4.status_code == 200
    svcs_data = res4.json()
    assert len(svcs_data) >= 1
    assert any(s["id"] == svc_id for s in svcs_data)
    print("  => TEST 04 (Model Selection): PASS")

    # 5. TEST 05: Service Card Data Structure
    target_svc = next(s for s in svcs_data if s["id"] == svc_id)
    assert "service_name" in target_svc
    assert "base_price" in target_svc
    assert "estimated_duration_minutes" in target_svc
    assert "warranty_months" in target_svc
    print("  => TEST 05 (Service Card Data): PASS")

    # 6. TEST 06: Service Detail (/api/services/{id})
    res6 = client.get(f"/api/services/{svc_id}")
    assert res6.status_code == 200
    detail_data = res6.json()
    assert detail_data["id"] == svc_id
    assert detail_data["model"]["id"] == model_id
    assert detail_data["brand"]["id"] == brand_id
    assert detail_data["category"]["id"] == cat_id
    print("  => TEST 06 (Service Detail): PASS")

    # 7. TEST 07 & 09: Guest Booking with Service Pre-fill
    future_date = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")
    booking_res = client.post("/api/booking/", json={
        "customer_name": "Task 04 Guest User",
        "phone_number": "0988776655",
        "device_type": "phone",
        "brand": brand.name,
        "device_model": dev_model.name,
        "symptoms": svc.service_name,
        "appointment_date": future_date,
        "appointment_time": "14:00 - 16:00"
    })
    assert booking_res.status_code == 200
    b_data = booking_res.json()
    assert b_data["booking_id"].startswith("FIX-")
    assert b_data["device_model"] == dev_model.name
    print("  => TEST 07 & 09 (Guest Booking & Service Navigation): PASS")

    # 8. TEST 11: Invalid Service Handling
    res11 = client.get("/api/services/999999")
    assert res11.status_code == 404
    print("  => TEST 11 (Invalid Service Handling): PASS")

    # 9. TEST 12: Inactive Service Exclusion
    db = SessionLocal()
    # Temporarily set service inactive
    test_svc = db.query(models.Service).filter(models.Service.id == svc_id).first()
    test_svc.is_active = False
    db.commit()

    res12 = client.get(f"/api/models/{model_id}/services")
    assert res12.status_code == 200
    active_svcs = res12.json()
    assert not any(s["id"] == svc_id for s in active_svcs)

    # Restore active state
    test_svc.is_active = True
    db.commit()
    db.close()
    print("  => TEST 12 (Inactive Service Exclusion): PASS")

    # 10. TEST 16 & 17: Price List, Tracking & History Regression
    track_res = client.get(f"/api/tickets/search?code={b_data['booking_id']}")
    assert track_res.status_code == 200
    assert len(track_res.json()) == 1
    print("  => TEST 16 & 17 (Tracking & History Regression): PASS")

    print("=" * 70)
    print("ALL TASK 04 INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_task04_tests()
