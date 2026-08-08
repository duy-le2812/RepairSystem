import os
from dotenv import load_dotenv

# Tải biến môi trường từ file .env (nếu có)
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import models, schemas
from database import engine, get_db
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from decimal import Decimal
from jose import JWTError, jwt
import bcrypt

# Import AIService (OpenRouter / extensible provider)
from services.ai_service import AIService

# ==========================================
# JWT CONFIGURATION
# ==========================================
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY is not set in .env")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # Token hết hạn sau 60 phút
security = HTTPBearer()

def verify_password(plain_password, hashed_password):
    try:
        if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        pass
    return plain_password == hashed_password

def get_password_hash(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

from sqlalchemy import text, inspect

def run_migrations():
    try:
        models.Base.metadata.create_all(bind=engine)
        inspector = inspect(engine)
        if inspector.has_table("repair_tickets"):
            existing_cols = [col["name"] for col in inspector.get_columns("repair_tickets")]
            with engine.connect() as conn:
                if "symptoms" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN symptoms TEXT;"))
                if "inspection_result" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN inspection_result TEXT;"))
                if "root_cause" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN root_cause TEXT;"))
                if "proposed_solution" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN proposed_solution TEXT;"))
                if "diagnosed_at" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN diagnosed_at TIMESTAMP;"))
                if "diagnosed_by_id" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN diagnosed_by_id INTEGER;"))
                if "branch_id" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN branch_id INTEGER;"))
                if "appointment_date" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN appointment_date VARCHAR(50);"))
                if "appointment_time" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN appointment_time VARCHAR(50);"))
                if "technician_id" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN technician_id INTEGER;"))
                if "repair_started_at" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN repair_started_at TIMESTAMP;"))
                if "repair_completed_at" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN repair_completed_at TIMESTAMP;"))
                if "repair_started_by_id" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN repair_started_by_id INTEGER;"))
                if "repair_completed_by_id" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN repair_completed_by_id INTEGER;"))
                if "repair_result" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN repair_result TEXT;"))
                if "qc_status" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN qc_status VARCHAR(20) DEFAULT 'NONE';"))
                if "qc_note" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN qc_note TEXT;"))
                if "qc_checked_at" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN qc_checked_at TIMESTAMP;"))
                if "qc_checked_by_id" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN qc_checked_by_id INTEGER;"))
                if "handover_at" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN handover_at TIMESTAMP;"))
                if "handed_over_by_id" not in existing_cols:
                    conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN handed_over_by_id INTEGER;"))
                conn.commit()
        if inspector.has_table("users"):
            user_cols = [col["name"] for col in inspector.get_columns("users")]
            if "created_at" not in user_cols:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"))
                    conn.commit()
        if inspector.has_table("services"):
            service_cols = [col["name"] for col in inspector.get_columns("services")]
            with engine.connect() as conn:
                if "model_id" not in service_cols:
                    conn.execute(text("ALTER TABLE services ADD COLUMN model_id INTEGER;"))
                if "estimated_duration_minutes" not in service_cols:
                    conn.execute(text("ALTER TABLE services ADD COLUMN estimated_duration_minutes INTEGER DEFAULT 60;"))
                if "warranty_months" not in service_cols:
                    conn.execute(text("ALTER TABLE services ADD COLUMN warranty_months INTEGER DEFAULT 6;"))
                if "is_active" not in service_cols:
                    conn.execute(text("ALTER TABLE services ADD COLUMN is_active BOOLEAN DEFAULT TRUE;"))
                if "created_at" not in service_cols:
                    conn.execute(text("ALTER TABLE services ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"))
                if "updated_at" not in service_cols:
                    conn.execute(text("ALTER TABLE services ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"))
                conn.commit()

    except Exception as e:
        print(f"Migration warning: {e}")

run_migrations()

# 1. TẠO BẢNG & KHỞI TẠO APP
models.Base.metadata.create_all(bind=engine)

from database import SessionLocal
from services.admin_initializer import initialize_admin
from services.catalog_seeder import seed_catalog

def seed_db():
    db = SessionLocal()
    try:
        initialize_admin(db)
        seed_catalog(db)
    finally:
        db.close()

seed_db()

app = FastAPI(title="Hệ thống Quản lý Dịch vụ Sửa chữa & AI Chẩn đoán")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Dấu * nghĩa là cho phép mọi Front-end gọi vào
    allow_credentials=True,
    allow_methods=["*"],  # Cho phép mọi phương thức HTTP (GET, POST, OPTIONS...)
    allow_headers=["*"],  # Cho phép mọi loại dữ liệu (Header)
)

# ==========================================
# JWT HELPER FUNCTIONS (định nghĩa trước các endpoint)
# ==========================================
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Tạo JWT Access Token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verify JWT token from Authorization header
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("username")
        user_id: int = payload.get("user_id")
        role: str = payload.get("role")
        
        if username is None or user_id is None:
            raise HTTPException(status_code=401, detail="Token không hợp lệ")
        
        return {"username": username, "user_id": user_id, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc hết hạn")

# API KIỂM TRA HỆ THỐNG
# ==========================================
@app.get("/", tags=["Hệ thống"])
def health_check():
    return {"status": "success", "message": "Backend FastAPI đang chạy mượt mà!"}

# ==========================================
# NHÓM API: QUẢN LÝ NGƯỜI DÙNG (USERS)
# ==========================================
@app.post("/api/users/", response_model=schemas.UserResponse, tags=["Người dùng"])
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    # Kiểm tra xem username đã tồn tại chưa
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại!")
    
    # Ở dự án thực tế sẽ cần mã hóa password, ở đây ta lưu tạm chuỗi gốc để demo
    new_user = models.User(
        username=user.username, 
        password_hash=user.password, 
        role=user.role,
        full_name=user.full_name,
        phone=user.phone
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/api/users/", response_model=List[schemas.UserResponse], tags=["Người dùng"])
def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    return db.query(models.User).all()

# ==========================================
import re

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[àáạảãâầấậẩẫăằắặẳẵ]', 'a', text)
    text = re.sub(r'[èéẹẻẽêềếệểễ]', 'e', text)
    text = re.sub(r'[ìíịỉĩ]', 'i', text)
    text = re.sub(r'[òóọỏõôồốộổỗơờớợởỡ]', 'o', text)
    text = re.sub(r'[ùúụủũưừứựửữ]', 'u', text)
    text = re.sub(r'[ỳýỵỷỹ]', 'y', text)
    text = re.sub(r'[đ]', 'd', text)
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text.strip('-')

def _map_service_to_response(s: models.Service) -> schemas.ServiceResponse:
    model_simple = None
    brand_simple = None
    cat_simple = None
    if s.device_model:
        model_simple = schemas.DeviceModelSimple(
            id=s.device_model.id,
            name=s.device_model.name,
            slug=s.device_model.slug
        )
        if s.device_model.brand:
            brand_simple = schemas.BrandSimple(
                id=s.device_model.brand.id,
                name=s.device_model.brand.name,
                slug=s.device_model.brand.slug
            )
            if s.device_model.brand.category:
                cat_simple = schemas.CategorySimple(
                    id=s.device_model.brand.category.id,
                    name=s.device_model.brand.category.name,
                    slug=s.device_model.brand.category.slug
                )
    return schemas.ServiceResponse(
        id=s.id,
        service_name=s.service_name,
        description=s.description,
        base_price=s.base_price,
        model_id=s.model_id,
        estimated_duration_minutes=s.estimated_duration_minutes or 60,
        warranty_months=s.warranty_months or 6,
        is_active=s.is_active if s.is_active is not None else True,
        model=model_simple,
        brand=brand_simple,
        category=cat_simple
    )

# ==========================================
# PUBLIC API: SERVICE CATALOG (Task 03)
# ==========================================
@app.get("/api/categories", response_model=List[schemas.CategoryResponse], tags=["Service Catalog"])
def get_active_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).filter(models.Category.is_active == True).all()

@app.get("/api/categories/{category_id}/brands", response_model=List[schemas.BrandResponse], tags=["Service Catalog"])
def get_brands_by_category(category_id: int, db: Session = Depends(get_db)):
    cat = db.query(models.Category).filter(models.Category.id == category_id, models.Category.is_active == True).first()
    if not cat:
        raise HTTPException(status_code=404, detail=f"Category (ID={category_id}) không tồn tại hoặc inactive!")
    return db.query(models.Brand).filter(models.Brand.category_id == category_id, models.Brand.is_active == True).all()

@app.get("/api/brands/{brand_id}/models", response_model=List[schemas.DeviceModelResponse], tags=["Service Catalog"])
def get_models_by_brand(brand_id: int, db: Session = Depends(get_db)):
    brand = db.query(models.Brand).filter(models.Brand.id == brand_id, models.Brand.is_active == True).first()
    if not brand:
        raise HTTPException(status_code=404, detail=f"Brand (ID={brand_id}) không tồn tại hoặc inactive!")
    return db.query(models.DeviceModel).filter(models.DeviceModel.brand_id == brand_id, models.DeviceModel.is_active == True).all()

@app.get("/api/models/{model_id}/services", response_model=List[schemas.ServiceResponse], tags=["Service Catalog"])
def get_services_by_model(model_id: int, db: Session = Depends(get_db)):
    dev_model = db.query(models.DeviceModel).filter(models.DeviceModel.id == model_id, models.DeviceModel.is_active == True).first()
    if not dev_model:
        raise HTTPException(status_code=404, detail=f"DeviceModel (ID={model_id}) không tồn tại hoặc inactive!")
    services = db.query(models.Service).filter(models.Service.model_id == model_id, models.Service.is_active == True).all()
    return [_map_service_to_response(s) for s in services]

@app.get("/api/services/{service_id}", response_model=schemas.ServiceResponse, tags=["Service Catalog"])
def get_service_detail(service_id: int, db: Session = Depends(get_db)):
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail=f"Dịch vụ (ID={service_id}) không tồn tại!")
    return _map_service_to_response(service)

# ==========================================
# ADMIN API: SERVICE CATALOG CRUD (Task 03)
# ==========================================
@app.post("/api/admin/categories", response_model=schemas.CategoryResponse, tags=["Admin Catalog"])
def create_category(request: schemas.CategoryCreate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền tạo Category!")
    
    slug = request.slug or slugify(request.name)
    existing_name = db.query(models.Category).filter(models.Category.name == request.name).first()
    if existing_name:
        raise HTTPException(status_code=400, detail=f"Category tên '{request.name}' đã tồn tại!")
    
    existing_slug = db.query(models.Category).filter(models.Category.slug == slug).first()
    if existing_slug:
        raise HTTPException(status_code=400, detail=f"Category slug '{slug}' đã tồn tại!")

    cat = models.Category(
        name=request.name,
        slug=slug,
        description=request.description,
        is_active=True
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

@app.get("/api/admin/categories", response_model=List[schemas.CategoryResponse], tags=["Admin Catalog"])
def admin_get_all_categories(db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền xem danh sách tất cả Categories!")
    return db.query(models.Category).all()

@app.put("/api/admin/categories/{category_id}", response_model=schemas.CategoryResponse, tags=["Admin Catalog"])
def update_category(category_id: int, request: schemas.CategoryUpdate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền cập nhật Category!")
    
    cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Không tìm thấy Category!")

    if request.name and request.name != cat.name:
        dup = db.query(models.Category).filter(models.Category.name == request.name, models.Category.id != category_id).first()
        if dup:
            raise HTTPException(status_code=400, detail=f"Category tên '{request.name}' đã tồn tại!")
        cat.name = request.name

    if request.slug and request.slug != cat.slug:
        dup_slug = db.query(models.Category).filter(models.Category.slug == request.slug, models.Category.id != category_id).first()
        if dup_slug:
            raise HTTPException(status_code=400, detail=f"Category slug '{request.slug}' đã tồn tại!")
        cat.slug = request.slug

    if request.description is not None:
        cat.description = request.description
    if request.is_active is not None:
        cat.is_active = request.is_active

    db.commit()
    db.refresh(cat)
    return cat

@app.delete("/api/admin/categories/{category_id}", tags=["Admin Catalog"])
def delete_category(category_id: int, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền xóa/deactivate Category!")
    
    cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Không tìm thấy Category!")

    cat.is_active = False
    db.commit()
    return {"message": f"Category '{cat.name}' đã được chuyển sang trạng thái inactive thành công!"}

@app.post("/api/admin/brands", response_model=schemas.BrandResponse, tags=["Admin Catalog"])
def create_brand(request: schemas.BrandCreate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền tạo Brand!")
    
    cat = db.query(models.Category).filter(models.Category.id == request.category_id).first()
    if not cat:
        raise HTTPException(status_code=400, detail=f"Category ID '{request.category_id}' không tồn tại!")

    slug = request.slug or slugify(request.name)
    existing_name = db.query(models.Brand).filter(models.Brand.category_id == request.category_id, models.Brand.name == request.name).first()
    if existing_name:
        raise HTTPException(status_code=400, detail=f"Brand '{request.name}' đã tồn tại trong Category này!")

    brand = models.Brand(
        category_id=request.category_id,
        name=request.name,
        slug=slug,
        description=request.description,
        is_active=True
    )
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand

@app.get("/api/admin/brands", response_model=List[schemas.BrandResponse], tags=["Admin Catalog"])
def admin_get_all_brands(category_id: Optional[int] = None, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền xem danh sách tất cả Brands!")
    query = db.query(models.Brand)
    if category_id:
        query = query.filter(models.Brand.category_id == category_id)
    return query.all()

@app.put("/api/admin/brands/{brand_id}", response_model=schemas.BrandResponse, tags=["Admin Catalog"])
def update_brand(brand_id: int, request: schemas.BrandUpdate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền cập nhật Brand!")
    
    brand = db.query(models.Brand).filter(models.Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Không tìm thấy Brand!")

    if request.category_id and request.category_id != brand.category_id:
        cat = db.query(models.Category).filter(models.Category.id == request.category_id).first()
        if not cat:
            raise HTTPException(status_code=400, detail=f"Category ID '{request.category_id}' không tồn tại!")
        brand.category_id = request.category_id

    if request.name:
        brand.name = request.name
    if request.slug:
        brand.slug = request.slug
    if request.description is not None:
        brand.description = request.description
    if request.is_active is not None:
        brand.is_active = request.is_active

    db.commit()
    db.refresh(brand)
    return brand

@app.delete("/api/admin/brands/{brand_id}", tags=["Admin Catalog"])
def delete_brand(brand_id: int, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền xóa/deactivate Brand!")
    
    brand = db.query(models.Brand).filter(models.Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Không tìm thấy Brand!")

    brand.is_active = False
    db.commit()
    return {"message": f"Brand '{brand.name}' đã được chuyển sang trạng thái inactive thành công!"}

@app.post("/api/admin/models", response_model=schemas.DeviceModelResponse, tags=["Admin Catalog"])
def create_model(request: schemas.DeviceModelCreate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền tạo DeviceModel!")
    
    brand = db.query(models.Brand).filter(models.Brand.id == request.brand_id).first()
    if not brand:
        raise HTTPException(status_code=400, detail=f"Brand ID '{request.brand_id}' không tồn tại!")

    slug = request.slug or slugify(request.name)
    existing_name = db.query(models.DeviceModel).filter(models.DeviceModel.brand_id == request.brand_id, models.DeviceModel.name == request.name).first()
    if existing_name:
        raise HTTPException(status_code=400, detail=f"Model '{request.name}' đã tồn tại trong Brand này!")

    dev_model = models.DeviceModel(
        brand_id=request.brand_id,
        name=request.name,
        slug=slug,
        description=request.description,
        is_active=True
    )
    db.add(dev_model)
    db.commit()
    db.refresh(dev_model)
    return dev_model

@app.get("/api/admin/models", response_model=List[schemas.DeviceModelResponse], tags=["Admin Catalog"])
def admin_get_all_models(brand_id: Optional[int] = None, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền xem danh sách tất cả Models!")
    query = db.query(models.DeviceModel)
    if brand_id:
        query = query.filter(models.DeviceModel.brand_id == brand_id)
    return query.all()

@app.put("/api/admin/models/{model_id}", response_model=schemas.DeviceModelResponse, tags=["Admin Catalog"])
def update_model(model_id: int, request: schemas.DeviceModelUpdate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền cập nhật DeviceModel!")
    
    dev_model = db.query(models.DeviceModel).filter(models.DeviceModel.id == model_id).first()
    if not dev_model:
        raise HTTPException(status_code=404, detail="Không tìm thấy DeviceModel!")

    if request.brand_id and request.brand_id != dev_model.brand_id:
        brand = db.query(models.Brand).filter(models.Brand.id == request.brand_id).first()
        if not brand:
            raise HTTPException(status_code=400, detail=f"Brand ID '{request.brand_id}' không tồn tại!")
        dev_model.brand_id = request.brand_id

    if request.name:
        dev_model.name = request.name
    if request.slug:
        dev_model.slug = request.slug
    if request.description is not None:
        dev_model.description = request.description
    if request.is_active is not None:
        dev_model.is_active = request.is_active

    db.commit()
    db.refresh(dev_model)
    return dev_model

@app.delete("/api/admin/models/{model_id}", tags=["Admin Catalog"])
def delete_model(model_id: int, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền xóa/deactivate DeviceModel!")
    
    dev_model = db.query(models.DeviceModel).filter(models.DeviceModel.id == model_id).first()
    if not dev_model:
        raise HTTPException(status_code=404, detail="Không tìm thấy DeviceModel!")

    dev_model.is_active = False
    db.commit()
    return {"message": f"DeviceModel '{dev_model.name}' đã được chuyển sang trạng thái inactive thành công!"}

# ==========================================
# NHÓM API: DANH MỤC DỊCH VỤ (SERVICES)
# ==========================================
@app.post("/api/services/", response_model=schemas.ServiceResponse, tags=["Dịch vụ"])
def create_service(service: schemas.ServiceCreate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if service.model_id:
        dev_model = db.query(models.DeviceModel).filter(models.DeviceModel.id == service.model_id).first()
        if not dev_model:
            raise HTTPException(status_code=400, detail=f"DeviceModel ID '{service.model_id}' không tồn tại!")

    new_service = models.Service(**service.model_dump())
    db.add(new_service)
    db.commit()
    db.refresh(new_service)
    return _map_service_to_response(new_service)

@app.get("/api/services/", response_model=List[schemas.ServiceResponse], tags=["Dịch vụ"])
def get_all_services(db: Session = Depends(get_db)):
    services = db.query(models.Service).filter(models.Service.is_active == True).all()
    return [_map_service_to_response(s) for s in services]

# ==========================================
# NHÓM API: THIẾT BỊ (DEVICES)
# ==========================================
@app.post("/api/devices/", response_model=schemas.DeviceResponse, tags=["Thiết bị"])
def create_device(device: schemas.DeviceCreate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    # Kiểm tra user có tồn tại không
    user = db.query(models.User).filter(models.User.id == device.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy khách hàng này!")
        
    new_device = models.Device(**device.model_dump())
    db.add(new_device)
    db.commit()
    db.refresh(new_device)
    return new_device

# ==========================================
# NHÓM API: QUẢN LÝ PHIẾU SỬA CHỮA (TICKETS)
# ==========================================
ALLOWED_TRANSITIONS = {
    "TiepNhan": ["DangKiemTra"],
    "DangKiemTra": ["DaChuanDoan", "TiepNhan"],
    "DaChuanDoan": ["ChoKhachXacNhan", "DangKiemTra"],
    "ChoKhachXacNhan": ["KhachDongY", "KhachTuChoi"],
    "KhachDongY": ["DangSua"],
    "KhachTuChoi": [],  # Không thể chuyển sang ĐangSua hoặc trạng thái khác nếu khách từ chối
    "DangSua": ["DaSuaXong"],
    "DaSuaXong": ["KiemTraChatLuong"],
    "KiemTraChatLuong": ["ChoKhachNhanMay"],
    "ChoKhachNhanMay": ["DaThanhToan"],
    "DaThanhToan": ["HoanThanh"],
    "HoanThanh": []
}

@app.post("/api/tickets/", response_model=schemas.RepairTicketResponse, tags=["Phiếu sửa chữa"])
def create_ticket(ticket: schemas.RepairTicketCreate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    new_ticket = models.RepairTicket(
        device_id=ticket.device_id,
        status=ticket.status,
        ai_diagnosis=ticket.ai_diagnosis,
        admin_notes=ticket.admin_notes,
        symptoms=ticket.ai_diagnosis
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    
    if ticket.details:
        for detail in ticket.details:
            new_detail = models.TicketDetail(
                ticket_id=new_ticket.id,
                service_id=detail.service_id,
                actual_price=detail.actual_price
            )
            db.add(new_detail)
        db.commit()
        db.refresh(new_ticket)
        
    history = models.TicketHistory(
        ticket_id=new_ticket.id,
        status=new_ticket.status,
        action="Tạo phiếu sửa chữa",
        actor_name=current_user.get("username", "Admin"),
        actor_role="admin",
        details="Phiếu được khởi tạo trên hệ thống."
    )
    db.add(history)
    db.commit()

    return new_ticket

@app.get("/api/tickets/", response_model=List[schemas.RepairTicketResponse], tags=["Phiếu sửa chữa"])
def get_tickets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    return db.query(models.RepairTicket).all()

@app.put("/api/tickets/{ticket_id}/status", tags=["Phiếu sửa chữa"])
def update_ticket_status(ticket_id: int, new_status: str, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền đổi trạng thái!")
        
    ticket = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu sửa chữa!")
        
    if new_status == ticket.status:
        return {"message": "Trạng thái không đổi!", "new_status": new_status}
        
    allowed = ALLOWED_TRANSITIONS.get(ticket.status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=400, 
            detail=f"Chuyển trạng thái không hợp lệ! Không thể chuyển từ '{ticket.status}' sang '{new_status}'."
        )
        
    old_status = ticket.status
    ticket.status = new_status
    
    history = models.TicketHistory(
        ticket_id=ticket.id,
        status=new_status,
        action="Cập nhật trạng thái",
        actor_name=current_user.get("username", "Admin"),
        actor_role="admin",
        details=f"Chuyển trạng thái từ '{old_status}' sang '{new_status}'."
    )
    db.add(history)
    db.commit()
    return {"message": "Cập nhật trạng thái thành công!", "new_status": new_status}

# ==========================================
# NHÓM API: CHẨN ĐOÁN & BÁO GIÁ (DIAGNOSIS & QUOTATION)
# ==========================================
@app.post("/api/tickets/{ticket_id}/diagnosis", response_model=schemas.DiagnosisResponse, tags=["Phiếu sửa chữa"])
@app.patch("/api/admin/tickets/{ticket_id}/diagnosis", response_model=schemas.DiagnosisResponse, tags=["Phiếu sửa chữa"])
def submit_diagnosis(ticket_id: int, diagnosis: schemas.DiagnosisCreate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền chẩn đoán!")
        
    ticket = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu sửa chữa!")
        
    if not diagnosis.inspection_result or not diagnosis.inspection_result.strip():
        raise HTTPException(status_code=400, detail="Kết quả kiểm tra không được để trống!")

    ticket.symptoms = diagnosis.symptoms or ticket.ai_diagnosis or ticket.symptoms
    ticket.inspection_result = diagnosis.inspection_result.strip()
    ticket.root_cause = diagnosis.root_cause.strip() if diagnosis.root_cause else None
    ticket.proposed_solution = diagnosis.proposed_solution.strip() if diagnosis.proposed_solution else None
    ticket.diagnosed_at = datetime.utcnow()
    ticket.diagnosed_by_id = current_user.get("user_id")
    ticket.status = "DaChuanDoan"
    
    history = models.TicketHistory(
        ticket_id=ticket.id,
        status="DaChuanDoan",
        action="Chẩn đoán lỗi",
        actor_name=current_user.get("username", "Admin"),
        actor_role="admin",
        details=f"Kết quả kiểm tra: {ticket.inspection_result} | Nguyên nhân: {ticket.root_cause or 'Chưa xác định'} | Hướng xử lý: {ticket.proposed_solution or 'Chưa xác định'}"
    )
    db.add(history)
    db.commit()
    db.refresh(ticket)
    
    return schemas.DiagnosisResponse(
        symptoms=ticket.symptoms,
        inspection_result=ticket.inspection_result,
        root_cause=ticket.root_cause,
        proposed_solution=ticket.proposed_solution,
        diagnosed_at=ticket.diagnosed_at,
        diagnosed_by_id=ticket.diagnosed_by_id
    )

@app.post("/api/tickets/{ticket_id}/quotation", response_model=schemas.QuotationResponse, tags=["Báo giá"])
@app.post("/api/admin/tickets/{ticket_id}/quotation", response_model=schemas.QuotationResponse, tags=["Báo giá"])
def submit_quotation(ticket_id: int, quote: schemas.QuotationCreate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền lập báo giá!")
        
    ticket = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu sửa chữa!")
        
    if quote.labor_cost < 0:
        raise HTTPException(status_code=400, detail="Chi phí công sửa không được âm!")
    if quote.additional_cost < 0:
        raise HTTPException(status_code=400, detail="Chi phí phát sinh không được âm!")

    for p in quote.parts:
        if p.unit_price < 0:
            raise HTTPException(status_code=400, detail="Đơn giá linh kiện không được âm!")
        if p.quantity <= 0:
            raise HTTPException(status_code=400, detail="Số lượng linh kiện phải lớn hơn 0!")
        if not p.part_name or not p.part_name.strip():
            raise HTTPException(status_code=400, detail="Tên linh kiện không được để trống!")

    is_draft = quote.is_draft or False
    if not is_draft and (not quote.parts or len(quote.parts) == 0):
        raise HTTPException(status_code=400, detail="Báo giá chính thức phải chứa ít nhất 1 linh kiện!")
        
    parts_total = sum(p.unit_price * p.quantity for p in quote.parts)
    total = parts_total + quote.labor_cost + quote.additional_cost
    target_decision = "draft" if is_draft else "pending"
    
    quotation = db.query(models.Quotation).filter(models.Quotation.ticket_id == ticket_id).first()
    if quotation:
        quotation.labor_cost = quote.labor_cost
        quotation.additional_cost = quote.additional_cost
        quotation.total_amount = total
        quotation.warranty = quote.warranty
        quotation.notes = quote.notes
        quotation.created_by_id = current_user.get("user_id")
        quotation.created_at = datetime.utcnow()
        quotation.customer_decision = target_decision
        quotation.confirmed_by = None
        quotation.confirmed_at = None
        quotation.rejection_reason = None
        
        db.query(models.QuotationItem).filter(models.QuotationItem.quotation_id == quotation.id).delete()
    else:
        quotation = models.Quotation(
            ticket_id=ticket_id,
            labor_cost=quote.labor_cost,
            additional_cost=quote.additional_cost,
            total_amount=total,
            warranty=quote.warranty,
            notes=quote.notes,
            created_by_id=current_user.get("user_id"),
            created_at=datetime.utcnow(),
            customer_decision=target_decision
        )
        db.add(quotation)
        db.flush()
        
    for p in quote.parts:
        item = models.QuotationItem(
            quotation_id=quotation.id,
            part_name=p.part_name.strip(),
            unit_price=p.unit_price,
            quantity=p.quantity,
            subtotal=p.unit_price * p.quantity
        )
        db.add(item)
        
    if not is_draft:
        ticket.status = "ChoKhachXacNhan"
    
    action_text = "Lưu nháp báo giá" if is_draft else "Lập báo giá"
    status_text = ticket.status if is_draft else "ChoKhachXacNhan"
    history = models.TicketHistory(
        ticket_id=ticket.id,
        status=status_text,
        action=action_text,
        actor_name=current_user.get("username", "Admin"),
        actor_role="admin",
        details=f"{action_text}: tổng chi phí {float(total):,.0f} VNĐ"
    )
    db.add(history)
    db.commit()
    db.refresh(quotation)
    
    items_data = [
        schemas.QuotationItemResponse(
            id=item.id,
            quotation_id=item.quotation_id,
            part_name=item.part_name,
            unit_price=item.unit_price,
            quantity=item.quantity,
            subtotal=item.subtotal
        ) for item in quotation.items
    ]
    
    return schemas.QuotationResponse(
        id=quotation.id,
        ticket_id=quotation.ticket_id,
        labor_cost=quotation.labor_cost,
        additional_cost=quotation.additional_cost,
        total_amount=quotation.total_amount,
        warranty=quotation.warranty,
        notes=quotation.notes,
        customer_decision=quotation.customer_decision,
        confirmed_by=quotation.confirmed_by,
        confirmed_at=quotation.confirmed_at,
        rejection_reason=quotation.rejection_reason,
        created_at=quotation.created_at,
        items=items_data
    )

@app.post("/api/tickets/{ticket_id}/quotation/respond", response_model=schemas.QuotationResponse, tags=["Báo giá"])
def respond_quotation(ticket_id: int, request: schemas.QuotationRespondRequest, db: Session = Depends(get_db)):
    ticket = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu sửa chữa!")
        
    quotation = db.query(models.Quotation).filter(models.Quotation.ticket_id == ticket_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo giá cho phiếu này!")
        
    if quotation.customer_decision == "draft":
        raise HTTPException(status_code=400, detail="Báo giá chưa được gửi tới khách hàng!")

    target_decision = "approved" if request.decision in ["approved", "accept", "accepted"] else "rejected"

    # Idempotency check (same decision submitted again)
    if quotation.customer_decision == target_decision:
        items_data = [
            schemas.QuotationItemResponse(
                id=item.id,
                quotation_id=item.quotation_id,
                part_name=item.part_name,
                unit_price=item.unit_price,
                quantity=item.quantity,
                subtotal=item.subtotal
            ) for item in quotation.items
        ]
        return schemas.QuotationResponse(
            id=quotation.id,
            ticket_id=quotation.ticket_id,
            labor_cost=quotation.labor_cost,
            additional_cost=quotation.additional_cost,
            total_amount=quotation.total_amount,
            warranty=quotation.warranty,
            notes=quotation.notes,
            customer_decision=quotation.customer_decision,
            confirmed_by=quotation.confirmed_by,
            confirmed_at=quotation.confirmed_at,
            rejection_reason=quotation.rejection_reason,
            created_at=quotation.created_at,
            items=items_data
        )

    # Double decision prevention
    if quotation.customer_decision == "approved" and target_decision == "rejected":
        raise HTTPException(status_code=400, detail="Báo giá đã được đồng ý trước đó, không thể chuyển sang từ chối!")
    if quotation.customer_decision == "rejected" and target_decision == "approved":
        raise HTTPException(status_code=400, detail="Báo giá đã bị từ chối trước đó, không thể chuyển sang đồng ý!")

    confirmed_by_name = request.customer_name or (ticket.device.owner.full_name if ticket.device and ticket.device.owner else "Khách hàng")
    
    if target_decision == "approved":
        quotation.customer_decision = "approved"
        quotation.confirmed_at = datetime.utcnow()
        quotation.confirmed_by = confirmed_by_name
        ticket.status = "KhachDongY"
        
        history = models.TicketHistory(
            ticket_id=ticket.id,
            status="KhachDongY",
            action="Khách đồng ý sửa",
            actor_name=confirmed_by_name,
            actor_role="customer",
            details="Khách hàng đã đồng ý phương án và chi phí báo giá."
        )
        db.add(history)
    else:
        quotation.customer_decision = "rejected"
        quotation.confirmed_at = datetime.utcnow()
        quotation.confirmed_by = confirmed_by_name
        quotation.rejection_reason = request.rejection_reason
        ticket.status = "KhachTuChoi"
        
        history = models.TicketHistory(
            ticket_id=ticket.id,
            status="KhachTuChoi",
            action="Khách từ chối sửa",
            actor_name=confirmed_by_name,
            actor_role="customer",
            details=f"Khách từ chối sửa. Lý do: {request.rejection_reason or 'Không nêu lý do'}"
        )
        db.add(history)
        
    db.commit()
    db.refresh(quotation)

    items_data = [
        schemas.QuotationItemResponse(
            id=item.id,
            quotation_id=item.quotation_id,
            part_name=item.part_name,
            unit_price=item.unit_price,
            quantity=item.quantity,
            subtotal=item.subtotal
        ) for item in quotation.items
    ]
    
    return schemas.QuotationResponse(
        id=quotation.id,
        ticket_id=quotation.ticket_id,
        labor_cost=quotation.labor_cost,
        additional_cost=quotation.additional_cost,
        total_amount=quotation.total_amount,
        warranty=quotation.warranty,
        notes=quotation.notes,
        customer_decision=quotation.customer_decision,
        confirmed_by=quotation.confirmed_by,
        confirmed_at=quotation.confirmed_at,
        rejection_reason=quotation.rejection_reason,
        created_at=quotation.created_at,
        items=items_data
    )

# ==========================================
# NHÓM API: WORKBOARD & REPAIR EXECUTION FOR TECHNICIAN (Task 06)
# ==========================================
def _map_ticket_for_technician(t: models.RepairTicket, db: Session) -> dict:
    device = t.device
    owner = device.owner if device else None
    
    parts_data = [
        {
            "id": p.id,
            "part_name": p.part_name,
            "unit_price": float(p.unit_price),
            "quantity": p.quantity,
            "subtotal": float(p.subtotal)
        } for p in t.actual_parts
    ] if t.actual_parts else []

    quotation_data = None
    if t.quotation:
        q_items = [
            {
                "id": it.id,
                "part_name": it.part_name,
                "unit_price": float(it.unit_price),
                "quantity": it.quantity,
                "subtotal": float(it.subtotal)
            } for it in t.quotation.items
        ]
        quotation_data = {
            "id": t.quotation.id,
            "ticket_id": t.quotation.ticket_id,
            "labor_cost": float(t.quotation.labor_cost),
            "additional_cost": float(t.quotation.additional_cost),
            "total_amount": float(t.quotation.total_amount),
            "warranty": t.quotation.warranty,
            "notes": t.quotation.notes,
            "customer_decision": t.quotation.customer_decision,
            "confirmed_by": t.quotation.confirmed_by,
            "confirmed_at": t.quotation.confirmed_at.isoformat() if t.quotation.confirmed_at else None,
            "rejection_reason": t.quotation.rejection_reason,
            "items": q_items
        }

    return {
        "id": f"FIX-{t.id:05d}",
        "numeric_id": t.id,
        "customerName": owner.full_name if owner else "Khách hàng",
        "phoneNumber": owner.phone if owner else "",
        "deviceType": device.device_type if device else "",
        "brand": device.brand if device else "",
        "deviceModel": device.model if device else "",
        "symptoms": t.symptoms or t.ai_diagnosis or "",
        "inspection_result": t.inspection_result,
        "root_cause": t.root_cause,
        "proposed_solution": t.proposed_solution,
        "status": t.status,
        "technician_id": t.technician_id,
        "technician_name": t.technician.full_name if t.technician else (t.technician.username if t.technician else None),
        "repair_started_at": t.repair_started_at.isoformat() if t.repair_started_at else None,
        "repair_completed_at": t.repair_completed_at.isoformat() if t.repair_completed_at else None,
        "repair_result": t.repair_result,
        "qc_status": t.qc_status or "NONE",
        "qc_note": t.qc_note,
        "qc_checked_at": t.qc_checked_at.isoformat() if t.qc_checked_at else None,
        "appointment_date": t.appointment_date,
        "appointment_time": t.appointment_time,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "quotation": quotation_data,
        "actual_parts": parts_data
    }

@app.get("/api/technician/workboard", tags=["Technician Workboard"])
def get_technician_workboard(status: Optional[str] = None, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    user_role = current_user.get("role")
    if user_role not in ["admin", "technician"]:
        raise HTTPException(status_code=403, detail="Chỉ Kỹ thuật viên hoặc Admin mới có quyền truy cập Workboard!")

    user_id = current_user.get("user_id")
    query = db.query(models.RepairTicket)

    if user_role == "technician":
        query = query.filter(
            (models.RepairTicket.technician_id == user_id) | (models.RepairTicket.technician_id == None)
        )

    if status and status != "ALL":
        query = query.filter(models.RepairTicket.status == status)

    tickets = query.order_by(models.RepairTicket.created_at.desc()).all()
    return [_map_ticket_for_technician(t, db) for t in tickets]

@app.get("/api/technician/tickets/{ticket_id}", tags=["Technician Workboard"])
def get_technician_ticket_detail(ticket_id: int, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    user_role = current_user.get("role")
    if user_role not in ["admin", "technician"]:
        raise HTTPException(status_code=403, detail="Chỉ Kỹ thuật viên hoặc Admin mới có quyền xem chi tiết!")

    ticket = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu sửa chữa!")

    user_id = current_user.get("user_id")
    if user_role == "technician" and ticket.technician_id and ticket.technician_id != user_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập phiếu này của kỹ thuật viên khác!")

    return _map_ticket_for_technician(ticket, db)

@app.post("/api/technician/tickets/{ticket_id}/assign", tags=["Technician Workboard"])
def assign_technician(ticket_id: int, request: schemas.TechnicianAssignmentRequest, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền phân công kỹ thuật viên!")

    ticket = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu sửa chữa!")

    tech_user = db.query(models.User).filter(models.User.id == request.technician_id).first()
    if not tech_user or tech_user.role not in ["admin", "technician"]:
        raise HTTPException(status_code=400, detail="Kỹ thuật viên được chỉ định không hợp lệ!")

    ticket.technician_id = request.technician_id
    history = models.TicketHistory(
        ticket_id=ticket.id,
        status=ticket.status,
        action="Phân công kỹ thuật viên",
        actor_name=current_user.get("username", "Admin"),
        actor_role="admin",
        details=f"Phân công cho {tech_user.full_name or tech_user.username}"
    )
    db.add(history)
    db.commit()
    db.refresh(ticket)
    return _map_ticket_for_technician(ticket, db)

@app.post("/api/technician/tickets/{ticket_id}/start", tags=["Technician Workboard"])
def start_repair(ticket_id: int, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    user_role = current_user.get("role")
    if user_role not in ["admin", "technician"]:
        raise HTTPException(status_code=403, detail="Chỉ Kỹ thuật viên hoặc Admin mới có quyền thực hiện sửa chữa!")

    ticket = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu sửa chữa!")

    user_id = current_user.get("user_id")
    if user_role == "technician" and ticket.technician_id and ticket.technician_id != user_id:
        raise HTTPException(status_code=403, detail="Phiếu này đã được phân công cho kỹ thuật viên khác!")

    # Rule 10 check: Can ONLY start if quotation approved / status KhachDongY / DangSua
    if not ticket.quotation or ticket.quotation.customer_decision != "approved":
        raise HTTPException(status_code=409, detail="Phiếu chưa được khách hàng đồng ý sửa chữa!")

    # Idempotency check: If already DangSua, return cleanly
    if ticket.status == "DangSua":
        return _map_ticket_for_technician(ticket, db)

    ticket.status = "DangSua"
    ticket.technician_id = user_id
    ticket.repair_started_at = datetime.utcnow()
    ticket.repair_started_by_id = user_id

    history = models.TicketHistory(
        ticket_id=ticket.id,
        status="DangSua",
        action="Bắt đầu sửa chữa",
        actor_name=current_user.get("username", "Kỹ thuật viên"),
        actor_role=user_role,
        details="Kỹ thuật viên bắt đầu tiến hành tháo lắp và sửa chữa thiết bị."
    )
    db.add(history)
    db.commit()
    db.refresh(ticket)
    return _map_ticket_for_technician(ticket, db)

@app.patch("/api/technician/tickets/{ticket_id}/execution", tags=["Technician Workboard"])
def update_repair_execution(ticket_id: int, request: schemas.RepairExecutionUpdate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    user_role = current_user.get("role")
    if user_role not in ["admin", "technician"]:
        raise HTTPException(status_code=403, detail="Chỉ Kỹ thuật viên hoặc Admin mới có quyền cập nhật quá trình sửa chữa!")

    ticket = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu sửa chữa!")

    user_id = current_user.get("user_id")
    if user_role == "technician" and ticket.technician_id and ticket.technician_id != user_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền cập nhật phiếu của kỹ thuật viên khác!")

    if request.repair_result is not None:
        ticket.repair_result = request.repair_result.strip()

    if request.parts_used is not None:
        for p in request.parts_used:
            if p.unit_price < 0:
                raise HTTPException(status_code=400, detail="Đơn giá linh kiện không được âm!")
            if p.quantity <= 0:
                raise HTTPException(status_code=400, detail="Số lượng linh kiện phải lớn hơn 0!")
            if not p.part_name or not p.part_name.strip():
                raise HTTPException(status_code=400, detail="Tên linh kiện không được để trống!")

        db.query(models.ActualPartUsed).filter(models.ActualPartUsed.ticket_id == ticket_id).delete()
        for p in request.parts_used:
            item = models.ActualPartUsed(
                ticket_id=ticket.id,
                part_name=p.part_name.strip(),
                unit_price=p.unit_price,
                quantity=p.quantity,
                subtotal=p.unit_price * p.quantity
            )
            db.add(item)

    db.commit()
    db.refresh(ticket)
    return _map_ticket_for_technician(ticket, db)

@app.post("/api/technician/tickets/{ticket_id}/complete", tags=["Technician Workboard"])
def complete_repair(ticket_id: int, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    user_role = current_user.get("role")
    if user_role not in ["admin", "technician"]:
        raise HTTPException(status_code=403, detail="Chỉ Kỹ thuật viên hoặc Admin mới có quyền hoàn thành sửa chữa!")

    ticket = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu sửa chữa!")

    user_id = current_user.get("user_id")
    if user_role == "technician" and ticket.technician_id and ticket.technician_id != user_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xử lý phiếu này!")

    if ticket.status != "DangSua":
        raise HTTPException(status_code=409, detail="Phiếu không ở trạng thái đang sửa!")

    if not ticket.repair_result or not ticket.repair_result.strip():
        raise HTTPException(status_code=400, detail="Vui lòng ghi nhận kết quả sửa chữa thực tế trước khi hoàn thành!")

    now = datetime.utcnow()
    if ticket.repair_started_at and now < ticket.repair_started_at:
        now = ticket.repair_started_at

    ticket.status = "DaSuaXong"
    ticket.repair_completed_at = now
    ticket.repair_completed_by_id = user_id
    ticket.qc_status = "PENDING"

    history = models.TicketHistory(
        ticket_id=ticket.id,
        status="DaSuaXong",
        action="Hoàn thành sửa chữa",
        actor_name=current_user.get("username", "Kỹ thuật viên"),
        actor_role=user_role,
        details=f"Kết quả sửa chữa: {ticket.repair_result}"
    )
    db.add(history)
    db.commit()
    db.refresh(ticket)
    return _map_ticket_for_technician(ticket, db)

@app.post("/api/technician/tickets/{ticket_id}/qc", tags=["Technician Workboard"])
def qc_check(ticket_id: int, request: schemas.QCCheckRequest, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    user_role = current_user.get("role")
    if user_role not in ["admin", "technician"]:
        raise HTTPException(status_code=403, detail="Chỉ Kỹ thuật viên hoặc Admin mới có quyền kiểm tra QC!")

    ticket = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu sửa chữa!")

    user_id = current_user.get("user_id")
    is_passed = request.result.lower() in ["passed", "pass"]

    if not is_passed:
        if not request.note or not request.note.strip():
            raise HTTPException(status_code=400, detail="Vui lòng nhập lý do QC không đạt!")

    now = datetime.utcnow()
    ticket.qc_checked_at = now
    ticket.qc_checked_by_id = user_id
    ticket.qc_note = request.note.strip() if request.note else None

    if is_passed:
        ticket.qc_status = "PASSED"
        ticket.status = "HoanTat"
        history = models.TicketHistory(
            ticket_id=ticket.id,
            status="HoanTat",
            action="Kiểm tra chất lượng (QC) - ĐẠT",
            actor_name=current_user.get("username", "QC Inspector"),
            actor_role=user_role,
            details="Thiết bị vượt qua kiểm tra chất lượng. Đã sẵn sàng giao trả cho khách hàng!"
        )
    else:
        ticket.qc_status = "FAILED"
        ticket.status = "DangSua"
        history = models.TicketHistory(
            ticket_id=ticket.id,
            status="DangSua",
            action="Kiểm tra chất lượng (QC) - KHÔNG ĐẠT",
            actor_name=current_user.get("username", "QC Inspector"),
            actor_role=user_role,
            details=f"QC Không Đạt. Lý do: {ticket.qc_note}. Chuyển phiếu lại cho Kỹ thuật viên sửa chữa!"
        )

    db.add(history)
    db.commit()
    db.refresh(ticket)
    return _map_ticket_for_technician(ticket, db)

# ==========================================
# NHÓM API: HANDOVER, PAYMENT & INVOICE (TASK 07)
# ==========================================
def _map_ticket_for_handover(t: models.RepairTicket, db: Session) -> dict:
    device = t.device
    owner = device.owner if device else None
    quotation_total = float(t.quotation.total_amount) if t.quotation else 0.0
    
    payment_data = None
    if t.payment:
        payment_data = {
            "id": t.payment.id,
            "amount": float(t.payment.amount),
            "payment_method": t.payment.payment_method,
            "payment_status": t.payment.payment_status,
            "transaction_reference": t.payment.transaction_reference,
            "paid_at": t.payment.paid_at.isoformat() if t.payment.paid_at else None,
            "received_by_id": t.payment.received_by_id
        }

    invoice_data = None
    if t.invoice:
        invoice_data = {
            "id": t.invoice.id,
            "invoice_number": t.invoice.invoice_number,
            "customer_name_snapshot": t.invoice.customer_name_snapshot,
            "phone_snapshot": t.invoice.phone_snapshot,
            "device_snapshot": t.invoice.device_snapshot,
            "service_snapshot": t.invoice.service_snapshot,
            "warranty_snapshot": t.invoice.warranty_snapshot,
            "quotation_amount": float(t.invoice.quotation_amount),
            "total_amount": float(t.invoice.total_amount),
            "payment_method": t.invoice.payment_method,
            "issued_at": t.invoice.issued_at.isoformat() if t.invoice.issued_at else None
        }

    return {
        "id": f"FIX-{t.id:05d}",
        "numeric_id": t.id,
        "customerName": owner.full_name if owner else "Khách hàng",
        "phoneNumber": owner.phone if owner else "",
        "deviceType": device.device_type if device else "",
        "brand": device.brand if device else "",
        "deviceModel": device.model if device else "",
        "symptoms": t.symptoms or t.ai_diagnosis or "",
        "inspection_result": t.inspection_result,
        "proposed_solution": t.proposed_solution,
        "status": t.status,
        "qc_status": t.qc_status or "NONE",
        "total_amount": quotation_total,
        "warranty": t.quotation.warranty if t.quotation else "6 tháng",
        "payment_status": t.payment.payment_status if t.payment else "UNPAID",
        "handover_status": "HANDED_OVER" if (t.status == "DaTraMay" or t.handover_at) else "READY",
        "handover_at": t.handover_at.isoformat() if t.handover_at else None,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "payment": payment_data,
        "invoice": invoice_data
    }

@app.get("/api/handover/ready", tags=["Handover & Payment"])
def get_ready_handover_tickets(db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    user_role = current_user.get("role")
    if user_role not in ["admin", "staff", "receptionist"]:
        raise HTTPException(status_code=403, detail="Chỉ Nhân viên hoặc Admin mới có quyền quản lý giao nhận!")

    tickets = db.query(models.RepairTicket).filter(
        (models.RepairTicket.qc_status == "PASSED") | 
        (models.RepairTicket.status.in_(["HoanTat", "DaSuaXong", "ChoKhachNhanMay", "DaThanhToan", "DaTraMay"]))
    ).order_by(models.RepairTicket.id.desc()).all()

    return [_map_ticket_for_handover(t, db) for t in tickets]

@app.post("/api/tickets/{ticket_id}/payment", tags=["Handover & Payment"])
def process_payment(ticket_id: int, request: schemas.PaymentRequest, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    user_role = current_user.get("role")
    if user_role not in ["admin", "staff", "receptionist"]:
        raise HTTPException(status_code=403, detail="Chỉ Nhân viên hoặc Admin mới có quyền thu tiền thanh toán!")

    ticket = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu sửa chữa!")

    # Check QC Pass
    if ticket.qc_status != "PASSED" and ticket.status not in ["HoanTat", "DaSuaXong", "ChoKhachNhanMay"]:
        raise HTTPException(status_code=409, detail="Thiết bị chưa qua kiểm tra QC ĐẠT! Không thể thu tiền.")

    # Duplicate payment check
    if ticket.payment and ticket.payment.payment_status == "PAID":
        raise HTTPException(status_code=409, detail="Phiếu đã được thanh toán trước đó!")

    if ticket.status == "DaTraMay":
        raise HTTPException(status_code=409, detail="Phiếu đã trả máy hoàn tất!")

    if not ticket.quotation or ticket.quotation.customer_decision != "approved":
        raise HTTPException(status_code=409, detail="Báo giá chưa được duyệt!")

    # Source of truth check
    approved_amount = Decimal(str(ticket.quotation.total_amount))
    if request.amount < 0:
        raise HTTPException(status_code=400, detail="Số tiền thanh toán không được âm!")
    if Decimal(str(request.amount)) != approved_amount:
        raise HTTPException(status_code=400, detail="Số tiền thanh toán không khớp với báo giá đã được duyệt!")

    now = datetime.utcnow()
    user_id = current_user.get("user_id")

    # Create Payment Record
    payment = models.Payment(
        ticket_id=ticket.id,
        amount=approved_amount,
        payment_method=request.payment_method,
        payment_status="PAID",
        transaction_reference=request.transaction_reference,
        paid_at=now,
        received_by_id=user_id
    )
    db.add(payment)

    # Create Invoice Record
    device = ticket.device
    owner = device.owner if device else None
    invoice_num = f"INV-{now.strftime('%Y%m%d')}-{ticket.id:05d}"
    
    invoice = models.Invoice(
        ticket_id=ticket.id,
        invoice_number=invoice_num,
        customer_name_snapshot=(owner.full_name or owner.username) if owner else "Khách hàng",
        phone_snapshot=(owner.phone or "") if owner else "",
        device_snapshot=f"{device.brand} {device.model}" if device else "Thiết bị",
        service_snapshot=ticket.proposed_solution or ticket.symptoms or "Dịch vụ sửa chữa",
        warranty_snapshot=ticket.quotation.warranty or "6 tháng",
        quotation_amount=approved_amount,
        total_amount=approved_amount,
        payment_method=request.payment_method,
        issued_at=now,
        issued_by_id=user_id
    )
    db.add(invoice)

    ticket.status = "DaThanhToan"

    history = models.TicketHistory(
        ticket_id=ticket.id,
        status="DaThanhToan",
        action="Thanh toán & Xuất hóa đơn",
        actor_name=current_user.get("username", "Thu ngân"),
        actor_role=user_role,
        details=f"Đã thanh toán {approved_amount:,.0f} VNĐ bằng {request.payment_method}. Hóa đơn: {invoice_num}"
    )
    db.add(history)

    db.commit()
    db.refresh(ticket)
    return _map_ticket_for_handover(ticket, db)

@app.post("/api/tickets/{ticket_id}/handover", tags=["Handover & Payment"])
def confirm_handover(ticket_id: int, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    user_role = current_user.get("role")
    if user_role not in ["admin", "staff", "receptionist"]:
        raise HTTPException(status_code=403, detail="Chỉ Nhân viên hoặc Admin mới có quyền bàn giao thiết bị!")

    ticket = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu sửa chữa!")

    if not ticket.payment or ticket.payment.payment_status != "PAID":
        raise HTTPException(status_code=409, detail="Phiếu chưa được thanh toán! Không thể giao máy.")

    if ticket.status == "DaTraMay" or ticket.handover_at:
        raise HTTPException(status_code=409, detail="Thiết bị đã được bàn giao cho khách hàng trước đó!")

    now = datetime.utcnow()
    user_id = current_user.get("user_id")

    ticket.status = "DaTraMay"
    ticket.handover_at = now
    ticket.handed_over_by_id = user_id

    history = models.TicketHistory(
        ticket_id=ticket.id,
        status="DaTraMay",
        action="Giao máy hoàn tất",
        actor_name=current_user.get("username", "Lễ tân"),
        actor_role=user_role,
        details="Đã bàn giao thiết bị cho khách hàng. Đơn hàng hoàn tất 100%!"
    )
    db.add(history)

    db.commit()
    db.refresh(ticket)
    return _map_ticket_for_handover(ticket, db)

@app.get("/api/tickets/{ticket_id}/invoice", tags=["Handover & Payment"])
def get_ticket_invoice(ticket_id: int, db: Session = Depends(get_db), credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))):
    ticket = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu sửa chữa!")

    if not ticket.invoice:
        raise HTTPException(status_code=404, detail="Phiếu chưa có hóa đơn thanh toán!")

    # Check permission
    if credentials:
        try:
            payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
            role = payload.get("role")
            user_id = payload.get("user_id")
            if role == "customer" and ticket.device and ticket.device.user_id != user_id:
                raise HTTPException(status_code=403, detail="Không có quyền xem hóa đơn của người khác!")
        except JWTError:
            pass

    invoice = ticket.invoice
    device = ticket.device
    owner = device.owner if device else None

    return {
        "invoice_number": invoice.invoice_number,
        "ticket_code": f"FIX-{ticket.id:05d}",
        "customer_name": invoice.customer_name_snapshot,
        "phone_number": invoice.phone_snapshot,
        "device_info": invoice.device_snapshot,
        "service_info": invoice.service_snapshot,
        "warranty": invoice.warranty_snapshot,
        "quotation_amount": float(invoice.quotation_amount),
        "total_amount": float(invoice.total_amount),
        "payment_method": invoice.payment_method,
        "payment_status": "PAID" if ticket.payment and ticket.payment.payment_status == "PAID" else "UNPAID",
        "issued_at": invoice.issued_at.isoformat(),
        "handover_at": ticket.handover_at.isoformat() if ticket.handover_at else None,
        "branch": {
            "name": ticket.branch.name if ticket.branch else "FASTCARE Chuyên Nghiệp",
            "address": ticket.branch.address if ticket.branch else "123 Đường 3/2, Q.10, TP.HCM",
            "hotline": ticket.branch.hotline if ticket.branch else "1800 6868"
        },
        "quotation_items": [
            {
                "part_name": item.part_name,
                "unit_price": float(item.unit_price),
                "quantity": item.quantity,
                "subtotal": float(item.subtotal)
            } for item in (ticket.quotation.items if ticket.quotation else [])
        ]
    }
    
    return schemas.QuotationResponse(
        id=quotation.id,
        ticket_id=quotation.ticket_id,
        labor_cost=quotation.labor_cost,
        additional_cost=quotation.additional_cost,
        total_amount=quotation.total_amount,
        warranty=quotation.warranty,
        notes=quotation.notes,
        customer_decision=quotation.customer_decision,
        confirmed_by=quotation.confirmed_by,
        confirmed_at=quotation.confirmed_at,
        rejection_reason=quotation.rejection_reason,
        created_at=quotation.created_at,
        items=items_data
    )

# ==========================================
# NHÓM API: SYSTEM OVERVIEW DASHBOARD & REPORTING (TASK 08)
# ==========================================
STATUS_LABELS = {
    "TiepNhan": "Mới tiếp nhận",
    "DangKiemTra": "Đang kiểm tra",
    "DaChuanDoan": "Đã chẩn đoán",
    "ChoKhachXacNhan": "Chờ khách xác nhận",
    "KhachDongY": "Khách đồng ý sửa",
    "DangSua": "Đang sửa chữa",
    "DaSuaXong": "Đã sửa xong",
    "KiemTraChatLuong": "Đang QC",
    "ChoKhachNhanMay": "Chờ giao máy",
    "DaThanhToan": "Đã thanh toán",
    "HoanThanh": "Hoàn tất",
    "DaTraMay": "Đã trả máy",
    "KhachTuChoi": "Khách từ chối"
}

@app.get("/api/admin/dashboard/overview", response_model=schemas.DashboardOverviewResponse, tags=["Dashboard & Thống Kê"])
def get_admin_dashboard_overview(
    range: str = Query("month", pattern="^(today|7days|30days|month|last_month)$"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token)
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền xem Dashboard quản trị!")

    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    
    # Range calculations for revenue date filter
    if range == "today":
        start_date = today_start
        end_date = now
    elif range == "7days":
        start_date = today_start - timedelta(days=6)
        end_date = now
    elif range == "30days":
        start_date = today_start - timedelta(days=29)
        end_date = now
    elif range == "last_month":
        first_this_month = datetime(now.year, now.month, 1)
        last_month_end = first_this_month - timedelta(days=1)
        start_date = datetime(last_month_end.year, last_month_end.month, 1)
        end_date = datetime(last_month_end.year, last_month_end.month, last_month_end.day, 23, 59, 59)
    else: # "month"
        start_date = datetime(now.year, now.month, 1)
        end_date = now

    # 1. KPI Summary Cards
    total_tickets = db.query(func.count(models.RepairTicket.id)).scalar() or 0
    active_repairs = db.query(func.count(models.RepairTicket.id)).filter(models.RepairTicket.status == "DangSua").scalar() or 0
    waiting_customer = db.query(func.count(models.RepairTicket.id)).filter(models.RepairTicket.status == "ChoKhachXacNhan").scalar() or 0
    ready_for_pickup = db.query(func.count(models.RepairTicket.id)).filter(
        (models.RepairTicket.qc_status == "PASSED") | (models.RepairTicket.status.in_(["HoanTat", "DaSuaXong", "ChoKhachNhanMay"]))
    ).filter(models.RepairTicket.status != "DaTraMay").scalar() or 0
    completed = db.query(func.count(models.RepairTicket.id)).filter(models.RepairTicket.status == "DaTraMay").scalar() or 0
    total_customers = db.query(func.count(models.User.id)).filter(models.User.role == "customer").scalar() or 0

    # Total Revenue (Only from PAID payments!)
    total_rev_sum = db.query(func.sum(models.Payment.amount)).filter(
        models.Payment.payment_status == "PAID",
        models.Payment.paid_at >= start_date,
        models.Payment.paid_at <= end_date
    ).scalar() or 0.0
    total_rev_decimal = Decimal(str(total_rev_sum))

    summary = schemas.DashboardSummaryResponse(
        total_tickets=total_tickets,
        active_repairs=active_repairs,
        waiting_customer=waiting_customer,
        ready_for_pickup=ready_for_pickup,
        completed=completed,
        total_customers=total_customers,
        revenue=total_rev_decimal
    )

    # 2. Status Distribution Statistics
    status_counts_raw = db.query(
        models.RepairTicket.status,
        func.count(models.RepairTicket.id)
    ).group_by(models.RepairTicket.status).all()
    
    status_dict = {s: count for s, count in status_counts_raw}
    status_distribution = []
    for st_code, label in STATUS_LABELS.items():
        cnt = status_dict.get(st_code, 0)
        status_distribution.append(schemas.StatusCountItem(status=st_code, label=label, count=cnt))

    # 3. Revenue Analytics Timeline (By Date)
    paid_payments = db.query(models.Payment).filter(
        models.Payment.payment_status == "PAID",
        models.Payment.paid_at >= start_date,
        models.Payment.paid_at <= end_date
    ).order_by(models.Payment.paid_at.asc()).all()

    revenue_by_date_map = {}
    curr_d = start_date.date()
    end_d = end_date.date()
    while curr_d <= end_d:
        revenue_by_date_map[curr_d.strftime("%Y-%m-%d")] = Decimal("0")
        curr_d += timedelta(days=1)

    for p in paid_payments:
        if p.paid_at:
            d_str = p.paid_at.strftime("%Y-%m-%d")
            if d_str in revenue_by_date_map:
                revenue_by_date_map[d_str] += Decimal(str(p.amount))

    revenue_by_date = [
        schemas.RevenueByDateItem(date=d, revenue=amt)
        for d, amt in sorted(revenue_by_date_map.items())
    ]

    # 4. Popular Devices & Brands Analytics
    device_stats_raw = db.query(
        models.Device.device_type,
        func.count(models.RepairTicket.id)
    ).join(models.RepairTicket, models.RepairTicket.device_id == models.Device.id)\
     .group_by(models.Device.device_type).all()

    total_dev_tickets = sum(count for _, count in device_stats_raw) or 1
    popular_devices = [
        schemas.DeviceStatItem(
            name=dtype or "Khác",
            count=count,
            percentage=round((count / total_dev_tickets) * 100, 1)
        ) for dtype, count in device_stats_raw
    ]

    brand_stats_raw = db.query(
        models.Device.brand,
        func.count(models.RepairTicket.id)
    ).join(models.RepairTicket, models.RepairTicket.device_id == models.Device.id)\
     .group_by(models.Device.brand)\
     .order_by(func.count(models.RepairTicket.id).desc()).limit(5).all()

    popular_brands = [
        schemas.BrandStatItem(name=brand or "Khác", count=count)
        for brand, count in brand_stats_raw
    ]

    # 5. Popular Services Analytics
    service_stats_raw = db.query(
        models.Service.service_name,
        func.count(models.TicketDetail.id)
    ).join(models.TicketDetail, models.TicketDetail.service_id == models.Service.id)\
     .group_by(models.Service.service_name)\
     .order_by(func.count(models.TicketDetail.id).desc()).limit(5).all()

    popular_services = [
        schemas.ServiceStatItem(name=sname, count=scount)
        for sname, scount in service_stats_raw
    ]

    # 6. Technician Performance Analytics
    techs = db.query(models.User).filter(models.User.role.in_(["technician", "admin"])).all()
    tech_performance = []
    for tech in techs:
        assigned_cnt = db.query(func.count(models.RepairTicket.id)).filter(models.RepairTicket.technician_id == tech.id).scalar() or 0
        completed_cnt = db.query(func.count(models.RepairTicket.id)).filter(
            models.RepairTicket.technician_id == tech.id,
            models.RepairTicket.status.in_(["DaTraMay", "HoanThanh"])
        ).scalar() or 0
        qc_pass_cnt = db.query(func.count(models.RepairTicket.id)).filter(
            models.RepairTicket.technician_id == tech.id,
            models.RepairTicket.qc_status == "PASSED"
        ).scalar() or 0
        qc_fail_cnt = db.query(func.count(models.RepairTicket.id)).filter(
            models.RepairTicket.technician_id == tech.id,
            models.RepairTicket.qc_status == "FAILED"
        ).scalar() or 0

        if assigned_cnt > 0 or completed_cnt > 0 or qc_pass_cnt > 0:
            tech_performance.append(schemas.TechnicianPerformanceItem(
                technician_id=tech.id,
                technician_name=tech.full_name or tech.username,
                assigned_count=assigned_cnt,
                completed_count=completed_cnt,
                qc_passed_count=qc_pass_cnt,
                qc_failed_count=qc_fail_cnt
            ))

    # 7. Outstanding / Aging Tickets
    active_tickets = db.query(models.RepairTicket).filter(
        models.RepairTicket.status.notin_(["DaTraMay", "HoanThanh", "KhachTuChoi"])
    ).order_by(models.RepairTicket.created_at.asc()).limit(10).all()

    outstanding_tickets = []
    for t in active_tickets:
        dev = t.device
        age_days = (now - t.created_at).days if t.created_at else 0
        outstanding_tickets.append(schemas.OutstandingTicketItem(
            ticket_code=f"FIX-{t.id:05d}",
            numeric_id=t.id,
            device_model=f"{dev.brand} {dev.model}" if dev else "Thiết bị",
            status=t.status,
            status_label=STATUS_LABELS.get(t.status, t.status),
            created_at=t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else "",
            aging_days=age_days
        ))

    # 8. Recent Activity Stream
    recent_histories = db.query(models.TicketHistory).order_by(models.TicketHistory.created_at.desc()).limit(8).all()
    recent_activity = [
        schemas.RecentActivityItem(
            ticket_code=f"FIX-{h.ticket_id:05d}",
            action=h.action,
            actor_name=h.actor_name,
            actor_role=h.actor_role,
            details=h.details,
            timestamp=h.created_at.strftime("%Y-%m-%d %H:%M:%S") if h.created_at else ""
        ) for h in recent_histories
    ]

    return schemas.DashboardOverviewResponse(
        summary=summary,
        status_distribution=status_distribution,
        revenue_by_date=revenue_by_date,
        popular_devices=popular_devices,
        popular_brands=popular_brands,
        popular_services=popular_services,
        technician_performance=tech_performance,
        outstanding_tickets=outstanding_tickets,
        recent_activity=recent_activity
    )

@app.get("/api/stats/", tags=["Dashboard & Thống Kê"])
def get_admin_stats(db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền xem thống kê!")

    total_customers = db.query(func.count(models.User.id)).filter(models.User.role == "customer").scalar() or 0
    total_tickets = db.query(func.count(models.RepairTicket.id)).scalar() or 0
    total_revenue = db.query(func.sum(models.Payment.amount)).filter(models.Payment.payment_status == "PAID").scalar() or 0.0

    status_counts_raw = db.query(
        models.RepairTicket.status,
        func.count(models.RepairTicket.id)
    ).group_by(models.RepairTicket.status).all()

    tickets_by_status = {status: count for status, count in status_counts_raw}

    return {
        "total_customers": total_customers,
        "total_tickets": total_tickets,
        "total_revenue": float(total_revenue),
        "tickets_by_status": tickets_by_status
    }

@app.get("/api/tickets/{ticket_id}/history", response_model=List[schemas.TicketHistoryResponse], tags=["Lịch sử"])
def get_ticket_history(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu sửa chữa!")
    return db.query(models.TicketHistory).filter(models.TicketHistory.ticket_id == ticket_id).order_by(models.TicketHistory.created_at.desc()).all()

@app.put("/api/tickets/{ticket_id}/notes", tags=["Phiếu sửa chữa"])
def update_ticket_notes(ticket_id: int, request: schemas.TicketNoteUpdate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền cập nhật ghi chú!")
    ticket = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu sửa chữa!")
    ticket.admin_notes = request.admin_notes
    db.commit()
    return {"message": "Cập nhật ghi chú thành công!"}

@app.get("/api/admin/tickets", response_model=List[schemas.TrackingResponse], tags=["Phiếu sửa chữa"])
def get_all_tickets_admin(db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Truy cập bị từ chối!")
    tickets = db.query(models.RepairTicket).order_by(models.RepairTicket.id.desc()).all()
    results = []
    for ticket in tickets:
        device = db.query(models.Device).filter(models.Device.id == ticket.device_id).first()
        if device:
            user = db.query(models.User).filter(models.User.id == device.user_id).first()
            if user:
                results.append(_map_ticket_to_tracking(user, ticket, db))
    return results


# ==========================================
# NHÓM API: TRACKING (Tìm kiếm phiếu sửa chữa)
# ==========================================
@app.get("/api/tickets/search", response_model=List[schemas.TrackingResponse], tags=["Tracking"])
def search_tickets(phone: str = None, code: str = None, db: Session = Depends(get_db), credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))):
    if not phone and not code:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp phone hoặc code!")
    
    current_user_data = None
    logged_in_user = None
    if credentials:
        try:
            current_user_data = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
            if current_user_data and current_user_data.get("user_id"):
                logged_in_user = db.query(models.User).filter(models.User.id == current_user_data.get("user_id")).first()
        except JWTError:
            pass

    results = []
    
    if phone:
        phone_normalized = phone.replace(' ', '').replace('-', '').replace('.', '')
        users = db.query(models.User).filter(
            models.User.phone.ilike(f"%{phone_normalized}%")
        ).all()
        
        for user in users:
            if current_user_data and current_user_data.get("role") == "customer":
                # Allow if same user ID or matching phone number
                if user.id != current_user_data.get("user_id") and (not logged_in_user or logged_in_user.phone != user.phone):
                    raise HTTPException(status_code=403, detail="Không có quyền xem thông tin phiếu của khách hàng khác!")

            tickets = db.query(models.RepairTicket).join(
                models.Device, models.RepairTicket.device_id == models.Device.id
            ).filter(models.Device.user_id == user.id).all()
            
            for ticket in tickets:
                results.append(_map_ticket_to_tracking(user, ticket, db))
    
    elif code:
        code_upper = code.upper()
        ticket_id = None
        if code_upper.startswith('FIX-'):
            try:
                ticket_id = int(code_upper.split('-')[1])
            except ValueError:
                raise HTTPException(status_code=400, detail="Định dạng mã phiếu không hợp lệ!")
        else:
            try:
                ticket_id = int(code_upper)
            except ValueError:
                raise HTTPException(status_code=400, detail="Định dạng mã phiếu không hợp lệ!")
        
        ticket = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiếu sửa chữa!")

        device = db.query(models.Device).filter(models.Device.id == ticket.device_id).first()
        if device:
            user = db.query(models.User).filter(models.User.id == device.user_id).first()
            if user:
                if current_user_data and current_user_data.get("role") == "customer":
                    if user.id != current_user_data.get("user_id") and (not logged_in_user or logged_in_user.phone != user.phone):
                        raise HTTPException(status_code=403, detail="Không có quyền xem thông tin phiếu của khách hàng khác!")
                results.append(_map_ticket_to_tracking(user, ticket, db))
    
    return results

def _map_ticket_to_tracking(user: models.User, ticket: models.RepairTicket, db: Session) -> schemas.TrackingResponse:
    device = db.query(models.Device).filter(models.Device.id == ticket.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị!")
    
    order_id = f"FIX-{ticket.id:05d}"
    timeline = _build_timeline(ticket.status, ticket.created_at)
    
    total_price = 0
    if ticket.quotation and ticket.quotation.customer_decision != "draft":
        total_price = int(ticket.quotation.total_amount)
    elif ticket.details:
        total_price = int(sum(d.actual_price for d in ticket.details))

    diagnosis_data = None
    if ticket.inspection_result or ticket.symptoms or ticket.root_cause:
        diagnosis_data = schemas.DiagnosisResponse(
            symptoms=ticket.symptoms or ticket.ai_diagnosis,
            inspection_result=ticket.inspection_result,
            root_cause=ticket.root_cause,
            proposed_solution=ticket.proposed_solution,
            diagnosed_at=ticket.diagnosed_at,
            diagnosed_by_id=ticket.diagnosed_by_id
        )

    quotation_data = None
    if ticket.quotation and ticket.quotation.customer_decision != "draft":
        items_data = [
            schemas.QuotationItemResponse(
                id=item.id,
                quotation_id=item.quotation_id,
                part_name=item.part_name,
                unit_price=item.unit_price,
                quantity=item.quantity,
                subtotal=item.subtotal
            ) for item in ticket.quotation.items
        ]
        quotation_data = schemas.QuotationResponse(
            id=ticket.quotation.id,
            ticket_id=ticket.quotation.ticket_id,
            labor_cost=ticket.quotation.labor_cost,
            additional_cost=ticket.quotation.additional_cost,
            total_amount=ticket.quotation.total_amount,
            warranty=ticket.quotation.warranty,
            notes=ticket.quotation.notes,
            customer_decision=ticket.quotation.customer_decision,
            confirmed_by=ticket.quotation.confirmed_by,
            confirmed_at=ticket.quotation.confirmed_at,
            rejection_reason=ticket.quotation.rejection_reason,
            created_at=ticket.quotation.created_at,
            items=items_data
        )

    histories_data = [
        schemas.TicketHistoryResponse(
            id=h.id,
            ticket_id=h.ticket_id,
            status=h.status,
            action=h.action,
            actor_name=h.actor_name,
            actor_role=h.actor_role,
            details=h.details,
            created_at=h.created_at
        ) for h in ticket.histories
    ]

    branch_id_str = str(ticket.branch_id) if ticket.branch_id else None
    branch_name = ticket.branch.name if ticket.branch else None

    # Backward compatibility for legacy data where branch_id was stored in admin_notes
    if not branch_id_str and ticket.admin_notes and ticket.admin_notes.startswith("Chi nhánh: "):
        raw_branch_val = ticket.admin_notes.replace("Chi nhánh: ", "").strip()
        if raw_branch_val.isdigit():
            branch_id_str = raw_branch_val
            b = db.query(models.Branch).filter(models.Branch.id == int(raw_branch_val)).first()
            if b:
                branch_name = b.name

    return schemas.TrackingResponse(
        id=order_id,
        customerName=user.full_name or user.username,
        phoneNumber=user.phone,
        deviceType=device.device_type or "other",
        brand=device.brand or "",
        deviceModel=device.model or "",
        symptoms=ticket.symptoms or ticket.ai_diagnosis or "",
        branchId=branch_id_str,
        branchName=branch_name,
        appointmentDate=ticket.appointment_date,
        appointmentTime=ticket.appointment_time,
        status=ticket.status,
        totalPrice=total_price,
        dateCreated=ticket.created_at.isoformat(),
        technicianNotes=ticket.admin_notes,
        timeline=timeline,
        diagnosis=diagnosis_data,
        quotation=quotation_data,
        histories=histories_data
    )

def _build_timeline(status: str, created_at) -> list:
    from datetime import datetime, timedelta
    
    status_order = [
        ('TiepNhan', 'received', 'Tiếp nhận thiết bị', 'Hệ thống đã ghi nhận lịch hẹn sửa chữa.'),
        ('DangKiemTra', 'inspecting', 'Đang kiểm tra', 'Kỹ thuật viên đang kiểm tra thiết bị để chẩn đoán lỗi.'),
        ('DaChuanDoan', 'diagnosed', 'Đã chẩn đoán lỗi', 'Đã có kết quả chẩn đoán lỗi và phương án sửa chữa.'),
        ('ChoKhachXacNhan', 'waiting_approval', 'Chờ khách xác nhận', 'Báo giá đã được lập, đang chờ phản hồi từ quý khách.'),
        ('KhachDongY', 'approved', 'Khách đồng ý sửa', 'Khách hàng đã đồng ý sửa chữa.'),
        ('DangSua', 'repairing', 'Đang tiến hành sửa', 'Tiến hành sửa chữa phần cứng/thay thế linh kiện.'),
        ('DaSuaXong', 'repaired', 'Đã sửa xong', 'Kỹ thuật viên đã hoàn thành công việc sửa chữa.'),
        ('KiemTraChatLuong', 'qc', 'Kiểm tra chất lượng (QC)', 'Kiểm tra chức năng hậu sửa chữa đảm bảo tiêu chuẩn.'),
        ('ChoKhachNhanMay', 'ready_for_pickup', 'Chờ khách nhận máy', 'Thiết bị đã sẵn sàng bàn giao cho quý khách.'),
        ('DaThanhToan', 'paid', 'Đã thanh toán', 'Đã hoàn tất thanh toán hóa đơn sửa chữa.'),
        ('HoanThanh', 'completed', 'Hoàn thành', 'Bàn giao thiết bị và hoàn tất dịch vụ.')
    ]

    if status == 'KhachTuChoi':
        status_order[4] = ('KhachTuChoi', 'rejected', 'Khách từ chối sửa', 'Khách hàng đã từ chối phương án báo giá.')

    current_pos = 0
    for i, item in enumerate(status_order):
        if item[0] == status:
            current_pos = i
            break

    base_time = created_at if hasattr(created_at, 'isoformat') else datetime.utcnow()
    
    timeline = []
    for i, item in enumerate(status_order):
        code_key, status_key, label, desc = item
        is_completed = i <= current_pos
        event_time = base_time + timedelta(hours=i) if is_completed and i > 0 else None
        
        timeline.append(schemas.TimelineEventResponse(
            status=status_key,
            statusLabel=label,
            timestamp=event_time.isoformat() if event_time else None,
            description=desc,
            isCompleted=is_completed
        ))
        
    return timeline


# ==========================================
# NHÓM API: BOOKING (Đặt lịch sửa chữa từ Frontend)
# ==========================================
@app.post("/api/booking/", response_model=schemas.BookingResponse, tags=["Booking"])
def create_booking(
    booking: schemas.BookingCreate,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
):
    """
    Endpoint duy nhất cho Frontend.
    Hỗ trợ cả khách đã đăng nhập (sử dụng Token) và khách vãng lai (Guest).
    """
    # 0. Validate branch & appointment date/time
    branch_id_int = None
    branch_obj = None
    if booking.branch_id:
        try:
            branch_id_int = int(booking.branch_id)
            branch_obj = db.query(models.Branch).filter(models.Branch.id == branch_id_int).first()
            if not branch_obj:
                raise HTTPException(status_code=400, detail=f"Chi nhánh (ID={booking.branch_id}) không tồn tại!")
        except ValueError:
            raise HTTPException(status_code=400, detail="Mã chi nhánh (branch_id) không hợp lệ!")

    if booking.appointment_date:
        try:
            app_date = datetime.strptime(booking.appointment_date, "%Y-%m-%d").date()
            today_date = datetime.utcnow().date()
            if app_date < today_date:
                raise HTTPException(status_code=400, detail="Không thể đặt lịch hẹn trong quá khứ!")
        except ValueError:
            raise HTTPException(status_code=400, detail="Định dạng ngày hẹn không hợp lệ (cần YYYY-MM-DD)!")

    if booking.appointment_time and not booking.appointment_time.strip():
        raise HTTPException(status_code=400, detail="Khung giờ hẹn không được để trống!")

    user = None

    # 1. Nếu có token đăng nhập, lấy User ID trực tiếp từ Token để gán chính xác Ticket cho Khách hàng!
    if credentials:
        try:
            payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("user_id")
            if user_id:
                user = db.query(models.User).filter(models.User.id == user_id).first()
        except JWTError:
            pass

    # 2. Nếu không có Token hoặc Token không hợp lệ, tìm/tạo User dựa trên số điện thoại
    if not user:
        phone_clean = booking.phone_number.replace(' ', '').replace('-', '')
        user = db.query(models.User).filter(models.User.phone == phone_clean).first()
        if not user:
            user = models.User(
                username=f"user_{phone_clean}",
                password_hash="temp_password",
                role="customer",
                full_name=booking.customer_name,
                phone=phone_clean
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    # Sync name and phone if missing
    if not user.full_name and booking.customer_name:
        user.full_name = booking.customer_name
    if not user.phone and booking.phone_number:
        user.phone = booking.phone_number.replace(' ', '').replace('-', '')
    db.commit()

    # 3. Tạo Device thuộc sở hữu của User này
    device = models.Device(
        user_id=user.id,
        device_type=booking.device_type,
        brand=booking.brand,
        model=booking.device_model
    )
    db.add(device)
    db.commit()
    db.refresh(device)

    # 4. Tạo RepairTicket
    ticket = models.RepairTicket(
        device_id=device.id,
        branch_id=branch_id_int,
        appointment_date=booking.appointment_date,
        appointment_time=booking.appointment_time,
        status="TiepNhan",
        symptoms=booking.symptoms,
        ai_diagnosis=booking.symptoms,
        admin_notes=None
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # 5. Ghi nhận nhật ký khởi tạo phiếu (TicketHistory)
    app_details = f" Lịch hẹn: {booking.appointment_date} {booking.appointment_time}" if booking.appointment_date else ""
    history = models.TicketHistory(
        ticket_id=ticket.id,
        status="TiepNhan",
        action="Tạo phiếu sửa chữa",
        actor_name=user.full_name or user.username,
        actor_role=user.role,
        details=f"Khách hàng đăng ký đặt lịch sửa chữa thiết bị {booking.brand} {booking.device_model}. Mô tả sự cố: {booking.symptoms}.{app_details}"
    )
    db.add(history)
    db.commit()

    booking_id = f"FIX-{ticket.id:05d}"

    return schemas.BookingResponse(
        booking_id=booking_id,
        user_id=user.id,
        device_id=device.id,
        ticket_id=ticket.id,
        customer_name=user.full_name or booking.customer_name,
        phone_number=user.phone or booking.phone_number,
        device_type=booking.device_type,
        brand=booking.brand,
        device_model=booking.device_model,
        status=ticket.status,
        created_at=ticket.created_at,
        appointment_date=ticket.appointment_date,
        appointment_time=ticket.appointment_time,
        branch_id=str(ticket.branch_id) if ticket.branch_id else None,
        branch_name=branch_obj.name if branch_obj else None
    )


# ==========================================
# ==========================================
# NHÓM API: AI CHATBOT
# ==========================================
from pydantic import BaseModel

@app.post("/api/chat/", response_model=schemas.ChatMessageResponse, tags=["AI Chatbot"])
def ai_chat(request: schemas.ChatMessageRequest):
    """
    Chat endpoint - Frontend gửi message, Backend xử lý qua OpenRouter.

    Frontend gửi: {"message": "...", "history": [{"role":"user","content":"..."},...]}
    Logic AI tách hoàn toàn tại services/ai_service.py (class AIService).
    """
    try:
        ai_text = AIService.chat(
            message=request.message,
            history=request.history or [],
        )
        return schemas.ChatMessageResponse(ai_response=ai_text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

# ==========================================
# NHÓM API: ĐĂNG KÝ (REGISTER) - PUBLIC
# ==========================================
@app.post("/api/auth/register", response_model=schemas.UserResponse, tags=["Xác thực"])
def register(user: schemas.UserRegister, db: Session = Depends(get_db)):
    # 1. Kiểm tra username trùng
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại!")
        
    # 2. Kiểm tra email trùng
    db_email = db.query(models.User).filter(models.User.email == user.email).first()
    if db_email:
        raise HTTPException(status_code=400, detail="Email đã được sử dụng!")
        
    # 3. Tạo user mới với role luôn là customer
    hashed_password = get_password_hash(user.password)
    
    new_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        role="customer",  # Backend tự gán cứng role
        full_name=user.full_name,
        phone=user.phone
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/api/auth/me", response_model=schemas.UserResponse, tags=["Xác thực"])
def get_current_user_info(db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    user = db.query(models.User).filter(models.User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng!")
    return user

@app.put("/api/auth/me", response_model=schemas.UserResponse, tags=["Xác thực"])
def update_profile(request: schemas.UserProfileUpdate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    user = db.query(models.User).filter(models.User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng!")
    
    if request.email and request.email != user.email:
        existing = db.query(models.User).filter(models.User.email == request.email, models.User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email này đã được sử dụng!")
        user.email = request.email
        
    if request.phone and request.phone != user.phone:
        user.phone = request.phone
        
    if request.full_name is not None:
        user.full_name = request.full_name
        
    db.commit()
    db.refresh(user)
    return user

@app.put("/api/auth/change-password", tags=["Xác thực"])
def change_password(request: schemas.ChangePasswordRequest, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    user = db.query(models.User).filter(models.User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng!")
        
    if not verify_password(request.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng!")

    if verify_password(request.new_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu mới không được trùng với mật khẩu hiện tại!")
        
    user.password_hash = get_password_hash(request.new_password)
    db.commit()
    return {"message": "Đổi mật khẩu thành công! Vui lòng đăng nhập lại."}

@app.get("/api/tickets/my-history", tags=["Phiếu sửa chữa"])
def get_my_repair_history(
    q: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token)
):
    user = db.query(models.User).filter(models.User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng!")
        
    query = db.query(models.RepairTicket).join(
        models.Device, models.RepairTicket.device_id == models.Device.id
    ).filter(models.Device.user_id == user.id)

    if status and status.strip() != "":
        query = query.filter(models.RepairTicket.status == status.strip())

    if q and q.strip() != "":
        keyword = f"%{q.strip()}%"
        q_upper = q.strip().upper()
        t_id = None
        if q_upper.startswith('FIX-'):
            try:
                t_id = int(q_upper.split('-')[1])
            except ValueError:
                pass
        elif q_upper.isdigit():
            t_id = int(q_upper)
            
        if t_id is not None:
            query = query.filter(models.RepairTicket.id == t_id)
        else:
            query = query.filter(
                (models.Device.brand.ilike(keyword)) |
                (models.Device.model.ilike(keyword)) |
                (models.RepairTicket.symptoms.ilike(keyword)) |
                (models.RepairTicket.ai_diagnosis.ilike(keyword))
            )

    total = query.count()
    tickets = query.order_by(models.RepairTicket.id.desc()).offset((page - 1) * limit).limit(limit).all()

    items = []
    for ticket in tickets:
        items.append(_map_ticket_to_tracking(user, ticket, db))
        
    pages = (total + limit - 1) // limit if total > 0 else 1

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages
    }

@app.get("/api/tickets/{ticket_id}", response_model=schemas.TrackingResponse, tags=["Phiếu sửa chữa"])
def get_ticket_by_id(ticket_id: int, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    ticket = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu sửa chữa!")
        
    device = db.query(models.Device).filter(models.Device.id == ticket.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị!")
        
    user = db.query(models.User).filter(models.User.id == device.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin khách hàng!")
        
    # Authorization Check: Customer can ONLY view their own ticket. Admin can view any ticket.
    if current_user.get("role") == "customer" and user.id != current_user.get("user_id"):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập phiếu của khách hàng khác!")
        
    return _map_ticket_to_tracking(user, ticket, db)



# ==========================================
# NHÓM API: XÁC THỰC (LOGIN)
# ==========================================
@app.post("/api/login/", response_model=schemas.TokenResponse, tags=["Xác thực"])
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    """
    Endpoint đăng nhập
    Trả về JWT Access Token
    """
    # Tìm user trong database
    user = db.query(models.User).filter(models.User.username == request.username).first()
    
    # Kiểm tra user có tồn tại và mật khẩu có khớp không
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Sai tài khoản hoặc mật khẩu!")
    
    # Tạo JWT token
    access_token = create_access_token(
        data={"username": user.username, "user_id": user.id, "role": user.role}
    )
    
    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        role=user.role,
        full_name=user.full_name
    )

# ==========================================
# NHÓM API: THỐNG KÊ CHO ADMIN (DASHBOARD)
# ==========================================
@app.get("/api/branches", response_model=List[schemas.BranchResponse], tags=["Chi nhánh"])
def get_branches(db: Session = Depends(get_db)):
    branches = db.query(models.Branch).all()
    if not branches:
        sample_branches = [
            models.Branch(
                name="Chi nhánh Hà Nội", 
                address="Số 1, Cầu Giấy, Hà Nội", 
                hotline="0901234567", 
                working_hours="8:00 - 18:00", 
                map_url="https://maps.google.com/?q=Hanoi"
            ),
            models.Branch(
                name="Chi nhánh TP.HCM", 
                address="Số 10, Quận 1, TP.HCM", 
                hotline="0909876543", 
                working_hours="8:00 - 20:00", 
                map_url="https://maps.google.com/?q=HCM"
            )
        ]
        db.add_all(sample_branches)
        db.commit()
        branches = db.query(models.Branch).all()
    return branches

@app.get("/api/stats/", tags=["Thống kê"])
def get_admin_stats(db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    # 1. Đếm tổng số khách hàng
    total_customers = db.query(models.User).filter(models.User.role == 'customer').count()
    
    # 2. Đếm tổng số phiếu sửa chữa
    total_tickets = db.query(models.RepairTicket).count()
    
    # 3. Tính tổng doanh thu (Cộng tất cả actual_price trong bảng ticket_details)
    total_revenue = db.query(func.sum(models.TicketDetail.actual_price)).scalar() or 0
    
    # 4. Thống kê trạng thái phiếu (Bao nhiêu phiếu Đang Sửa, Đã Xong...)
    tickets_by_status = db.query(
        models.RepairTicket.status, 
        func.count(models.RepairTicket.id)
    ).group_by(models.RepairTicket.status).all()

    return {
        "total_customers": total_customers,
        "total_tickets": total_tickets,
        "total_revenue": total_revenue,
        "tickets_by_status": dict(tickets_by_status)
    }

# ==========================================
# NHÓM API: XÓA DỮ LIỆU (DELETE) - Ví dụ Xóa Dịch vụ
# ==========================================
@app.delete("/api/services/{service_id}", tags=["Dịch vụ"])
def delete_service(service_id: int, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền xóa/deactivate dịch vụ!")
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Không tìm thấy dịch vụ này!")
        
    # Check if linked to ticket details
    ticket_details_count = db.query(models.TicketDetail).filter(models.TicketDetail.service_id == service_id).count()
    if ticket_details_count > 0:
        service.is_active = False
        db.commit()
        return {"message": "Dịch vụ đã được cập nhật sang trạng thái inactive để bảo toàn lịch sử phiếu sửa chữa."}

    service.is_active = False
    db.commit()
    return {"message": "Đã chuyển dịch vụ sang trạng thái inactive thành công!"}

# ==========================================
# NHÓM API: ADMIN CRUD (Branches, Services, Users)
# ==========================================
@app.post("/api/branches", response_model=schemas.BranchResponse, tags=["Chi nhánh"])
def create_branch(request: schemas.BranchCreate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền thêm chi nhánh!")
    new_branch = models.Branch(**request.model_dump(by_alias=False))
    db.add(new_branch)
    db.commit()
    db.refresh(new_branch)
    return new_branch

@app.put("/api/branches/{branch_id}", response_model=schemas.BranchResponse, tags=["Chi nhánh"])
def update_branch(branch_id: int, request: schemas.BranchUpdate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền cập nhật chi nhánh!")
    branch = db.query(models.Branch).filter(models.Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Không tìm thấy chi nhánh!")
    
    update_data = request.model_dump(exclude_unset=True, by_alias=False)
    for key, value in update_data.items():
        setattr(branch, key, value)
    
    db.commit()
    db.refresh(branch)
    return branch

@app.delete("/api/branches/{branch_id}", tags=["Chi nhánh"])
def delete_branch(branch_id: int, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền xóa chi nhánh!")
    branch = db.query(models.Branch).filter(models.Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Không tìm thấy chi nhánh!")
    db.delete(branch)
    db.commit()
    return {"message": "Đã xóa chi nhánh thành công!"}

@app.put("/api/services/{service_id}", response_model=schemas.ServiceResponse, tags=["Dịch vụ"])
def update_service(service_id: int, request: schemas.ServiceUpdate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền cập nhật dịch vụ!")
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Không tìm thấy dịch vụ!")
    
    update_data = request.model_dump(exclude_unset=True)
    if "model_id" in update_data and update_data["model_id"] is not None:
        dev_model = db.query(models.DeviceModel).filter(models.DeviceModel.id == update_data["model_id"]).first()
        if not dev_model:
            raise HTTPException(status_code=400, detail=f"DeviceModel ID '{update_data['model_id']}' không tồn tại!")

    for key, value in update_data.items():
        setattr(service, key, value)
        
    db.commit()
    db.refresh(service)
    return _map_service_to_response(service)

@app.put("/api/users/{user_id}/role", tags=["Người dùng"])
def update_user_role(user_id: int, request: schemas.UserRoleUpdate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền thay đổi Role!")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng!")
    
    if request.role not in ["admin", "customer"]:
        raise HTTPException(status_code=400, detail="Role không hợp lệ! Chỉ chấp nhận admin hoặc customer.")
        
    user.role = request.role
    db.commit()
    return {"message": f"Cập nhật quyền thành công. Role mới: {user.role}"}