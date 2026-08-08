from sqlalchemy.orm import Session
import models

def seed_catalog(db: Session):
    """
    Idempotent catalog database seeder.
    Populates Categories, Brands, DeviceModels, and Services if not present.
    """
    # 1. Categories Data
    categories_data = [
        {"name": "Điện thoại", "slug": "dien-thoai", "description": "Dịch vụ sửa chữa smartphone, điện thoại di động"},
        {"name": "Laptop", "slug": "laptop", "description": "Dịch vụ sửa chữa máy tính xách tay, MacBook, Ultrabook"},
        {"name": "Tablet", "slug": "tablet", "description": "Dịch vụ sửa chữa máy tính bảng iPad, Samsung Tab"},
    ]

    cat_map = {}
    for cat in categories_data:
        existing = db.query(models.Category).filter(models.Category.slug == cat["slug"]).first()
        if not existing:
            existing = models.Category(
                name=cat["name"],
                slug=cat["slug"],
                description=cat["description"],
                is_active=True
            )
            db.add(existing)
            db.commit()
            db.refresh(existing)
        cat_map[cat["name"]] = existing.id

    # 2. Brands Data
    brands_data = [
        {"category_name": "Điện thoại", "name": "Apple", "slug": "apple-phone"},
        {"category_name": "Điện thoại", "name": "Samsung", "slug": "samsung-phone"},
        {"category_name": "Laptop", "name": "Dell", "slug": "dell-laptop"},
        {"category_name": "Laptop", "name": "ASUS", "slug": "asus-laptop"},
        {"category_name": "Tablet", "name": "Apple", "slug": "apple-tablet"},
    ]

    brand_map = {}
    for b in brands_data:
        cat_id = cat_map[b["category_name"]]
        existing = db.query(models.Brand).filter(
            models.Brand.category_id == cat_id,
            models.Brand.slug == b["slug"]
        ).first()
        if not existing:
            existing = models.Brand(
                category_id=cat_id,
                name=b["name"],
                slug=b["slug"],
                is_active=True
            )
            db.add(existing)
            db.commit()
            db.refresh(existing)
        brand_map[f"{b['category_name']}_{b['name']}"] = existing.id

    # 3. DeviceModels Data
    models_data = [
        {"cat_brand": "Điện thoại_Apple", "name": "iPhone 13", "slug": "iphone-13"},
        {"cat_brand": "Điện thoại_Apple", "name": "iPhone 14 Pro", "slug": "iphone-14-pro"},
        {"cat_brand": "Điện thoại_Samsung", "name": "Galaxy S24", "slug": "galaxy-s24"},
        {"cat_brand": "Laptop_Dell", "name": "XPS 13", "slug": "xps-13"},
        {"cat_brand": "Laptop_ASUS", "name": "ROG Zephyrus G14", "slug": "rog-zephyrus-g14"},
        {"cat_brand": "Tablet_Apple", "name": "iPad Pro 12.9", "slug": "ipad-pro-129"},
    ]

    model_map = {}
    for m in models_data:
        brand_id = brand_map[m["cat_brand"]]
        existing = db.query(models.DeviceModel).filter(
            models.DeviceModel.brand_id == brand_id,
            models.DeviceModel.slug == m["slug"]
        ).first()
        if not existing:
            existing = models.DeviceModel(
                brand_id=brand_id,
                name=m["name"],
                slug=m["slug"],
                is_active=True
            )
            db.add(existing)
            db.commit()
            db.refresh(existing)
        model_map[m["name"]] = existing.id

    # 4. Services Data
    services_data = [
        {
            "model_name": "iPhone 14 Pro",
            "service_name": "Thay pin iPhone 14 Pro",
            "description": "Thay pin chính hãng Apple dung lượng chuẩn, bảo hành 12 tháng",
            "base_price": 1200000,
            "estimated_duration_minutes": 45,
            "warranty_months": 12
        },
        {
            "model_name": "iPhone 14 Pro",
            "service_name": "Thay màn hình iPhone 14 Pro",
            "description": "Thay màn hình OLED ProMotion 120Hz nguyên bộ, hiển thị sắc nét",
            "base_price": 4500000,
            "estimated_duration_minutes": 60,
            "warranty_months": 12
        },
        {
            "model_name": "iPhone 13",
            "service_name": "Thay pin iPhone 13",
            "description": "Thay pin dung lượng cao tương thích tuyệt đối với iPhone 13",
            "base_price": 950000,
            "estimated_duration_minutes": 45,
            "warranty_months": 12
        },
        {
            "model_name": "iPhone 13",
            "service_name": "Thay màn hình iPhone 13",
            "description": "Thay màn hình Super Retina XDR cao cấp",
            "base_price": 3200000,
            "estimated_duration_minutes": 60,
            "warranty_months": 12
        },
        {
            "model_name": "Galaxy S24",
            "service_name": "Thay pin Galaxy S24",
            "description": "Thay pin Samsung Galaxy S24 chính hãng",
            "base_price": 850000,
            "estimated_duration_minutes": 45,
            "warranty_months": 6
        },
        {
            "model_name": "Galaxy S24",
            "service_name": "Thay màn hình Galaxy S24",
            "description": "Thay màn hình Dynamic AMOLED 2X sắc nét",
            "base_price": 3800000,
            "estimated_duration_minutes": 60,
            "warranty_months": 6
        },
        {
            "model_name": "XPS 13",
            "service_name": "Thay pin Dell XPS 13",
            "description": "Thay pin laptop Dell XPS 13 chính hãng",
            "base_price": 1500000,
            "estimated_duration_minutes": 60,
            "warranty_months": 6
        },
        {
            "model_name": "XPS 13",
            "service_name": "Vệ sinh laptop Dell XPS 13",
            "description": "Vệ sinh tổng thể, tra keo tản nhiệt cao cấp x2 làm mát máy",
            "base_price": 250000,
            "estimated_duration_minutes": 30,
            "warranty_months": 3
        },
        {
            "model_name": "ROG Zephyrus G14",
            "service_name": "Thay quạt tản nhiệt ASUS G14",
            "description": "Thay bộ quạt tản nhiệt dual fan nguyên bản",
            "base_price": 650000,
            "estimated_duration_minutes": 60,
            "warranty_months": 6
        },
        {
            "model_name": "ROG Zephyrus G14",
            "service_name": "Vệ sinh tra keo tản nhiệt ASUS G14",
            "description": "Vệ sinh keo tản nhiệt kim loại lỏng/Grizzly chuyên dụng",
            "base_price": 300000,
            "estimated_duration_minutes": 45,
            "warranty_months": 3
        },
        {
            "model_name": "iPad Pro 12.9",
            "service_name": "Thay pin iPad Pro 12.9",
            "description": "Thay pin iPad Pro 12.9 inch chuẩn dung lượng Apple",
            "base_price": 1800000,
            "estimated_duration_minutes": 90,
            "warranty_months": 12
        },
        {
            "model_name": "iPad Pro 12.9",
            "service_name": "Thay kính iPad Pro 12.9",
            "description": "Ép kính màn hình cảm ứng iPad Pro 12.9 inch",
            "base_price": 2200000,
            "estimated_duration_minutes": 120,
            "warranty_months": 6
        },
    ]

    for s in services_data:
        m_id = model_map[s["model_name"]]
        existing = db.query(models.Service).filter(
            models.Service.model_id == m_id,
            models.Service.service_name == s["service_name"]
        ).first()
        if not existing:
            existing = models.Service(
                model_id=m_id,
                service_name=s["service_name"],
                description=s["description"],
                base_price=s["base_price"],
                estimated_duration_minutes=s["estimated_duration_minutes"],
                warranty_months=s["warranty_months"],
                is_active=True
            )
            db.add(existing)
            db.commit()

    print("Catalog seed completed successfully.")
