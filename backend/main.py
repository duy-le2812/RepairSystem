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

from sqlalchemy import text

def run_migrations():
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS symptoms TEXT;"))
            conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS inspection_result TEXT;"))
            conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS root_cause TEXT;"))
            conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS proposed_solution TEXT;"))
            conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS diagnosed_at TIMESTAMP;"))
            conn.execute(text("ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS diagnosed_by_id INTEGER;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"))
            conn.commit()

    except Exception as e:
        print(f"Migration warning: {e}")

run_migrations()

# 1. TẠO BẢNG & KHỞI TẠO APP
models.Base.metadata.create_all(bind=engine)


from database import SessionLocal
from services.admin_initializer import initialize_admin

def seed_db():
    db = SessionLocal()
    try:
        initialize_admin(db)
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
# NHÓM API: DANH MỤC DỊCH VỤ (SERVICES)
# ==========================================
@app.post("/api/services/", response_model=schemas.ServiceResponse, tags=["Dịch vụ"])
def create_service(service: schemas.ServiceCreate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    new_service = models.Service(**service.model_dump())
    db.add(new_service)
    db.commit()
    db.refresh(new_service)
    return new_service

@app.get("/api/services/", response_model=List[schemas.ServiceResponse], tags=["Dịch vụ"])
def get_all_services(db: Session = Depends(get_db)):
    return db.query(models.Service).all()

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

@app.post("/api/tickets/{ticket_id}/diagnosis", response_model=schemas.DiagnosisResponse, tags=["Phiếu sửa chữa"])
def submit_diagnosis(ticket_id: int, diagnosis: schemas.DiagnosisCreate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền chẩn đoán!")
        
    ticket = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu sửa chữa!")
        
    ticket.symptoms = diagnosis.symptoms or ticket.ai_diagnosis or ticket.symptoms
    ticket.inspection_result = diagnosis.inspection_result
    ticket.root_cause = diagnosis.root_cause
    ticket.proposed_solution = diagnosis.proposed_solution
    ticket.diagnosed_at = datetime.utcnow()
    ticket.diagnosed_by_id = current_user.get("user_id")
    ticket.status = "DaChuanDoan"
    
    history = models.TicketHistory(
        ticket_id=ticket.id,
        status="DaChuanDoan",
        action="Chẩn đoán lỗi",
        actor_name=current_user.get("username", "Admin"),
        actor_role="admin",
        details=f"Kết quả kiểm tra: {diagnosis.inspection_result} | Nguyên nhân: {diagnosis.root_cause} | Hướng xử lý: {diagnosis.proposed_solution}"
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
def submit_quotation(ticket_id: int, quote: schemas.QuotationCreate, db: Session = Depends(get_db), current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền lập báo giá!")
        
    ticket = db.query(models.RepairTicket).filter(models.RepairTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu sửa chữa!")
        
    if not quote.parts or len(quote.parts) == 0:
        raise HTTPException(status_code=422, detail="Báo giá phải chứa ít nhất 1 linh kiện!")
        
    parts_total = sum(p.unit_price * p.quantity for p in quote.parts)
    total = parts_total + quote.labor_cost + quote.additional_cost
    
    quotation = db.query(models.Quotation).filter(models.Quotation.ticket_id == ticket_id).first()
    if quotation:
        quotation.labor_cost = quote.labor_cost
        quotation.additional_cost = quote.additional_cost
        quotation.total_amount = total
        quotation.warranty = quote.warranty
        quotation.notes = quote.notes
        quotation.created_by_id = current_user.get("user_id")
        quotation.created_at = datetime.utcnow()
        quotation.customer_decision = "pending"
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
            customer_decision="pending"
        )
        db.add(quotation)
        db.flush()
        
    for p in quote.parts:
        item = models.QuotationItem(
            quotation_id=quotation.id,
            part_name=p.part_name,
            unit_price=p.unit_price,
            quantity=p.quantity,
            subtotal=p.unit_price * p.quantity
        )
        db.add(item)
        
    ticket.status = "ChoKhachXacNhan"
    
    history = models.TicketHistory(
        ticket_id=ticket.id,
        status="ChoKhachXacNhan",
        action="Lập báo giá",
        actor_name=current_user.get("username", "Admin"),
        actor_role="admin",
        details=f"Tổng chi phí báo giá: {float(total):,.0f} VNĐ"
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
        
    # Idempotency / Double submit check
    if quotation.customer_decision == request.decision:
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

    if quotation.customer_decision != "pending" and quotation.customer_decision != request.decision:
        raise HTTPException(status_code=400, detail="Báo giá đã được phản hồi trước đó!")

    confirmed_by_name = request.customer_name or (ticket.device.owner.full_name if ticket.device and ticket.device.owner else "Khách hàng")
    
    if request.decision == "approved":
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
    if ticket.quotation:
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
    if ticket.quotation:
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

    return schemas.TrackingResponse(
        id=order_id,
        customerName=user.full_name or user.username,
        phoneNumber=user.phone,
        deviceType=device.device_type or "other",
        brand=device.brand or "",
        deviceModel=device.model or "",
        symptoms=ticket.symptoms or ticket.ai_diagnosis or "",
        branchId=None,
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
        status="TiepNhan",
        symptoms=booking.symptoms,
        ai_diagnosis=booking.symptoms,
        admin_notes=f"Chi nhánh: {booking.branch_id}" if booking.branch_id else None
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # 5. Ghi nhận nhật ký khởi tạo phiếu (TicketHistory)
    history = models.TicketHistory(
        ticket_id=ticket.id,
        status="TiepNhan",
        action="Tạo phiếu sửa chữa",
        actor_name=user.full_name or user.username,
        actor_role=user.role,
        details=f"Khách hàng đăng ký đặt lịch sửa chữa thiết bị {booking.brand} {booking.device_model}. Mô tả sự cố: {booking.symptoms}"
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
        created_at=ticket.created_at
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
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Không tìm thấy dịch vụ này!")
        
    db.delete(service)
    db.commit()
    return {"message": "Đã xóa dịch vụ thành công!"}

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
    for key, value in update_data.items():
        setattr(service, key, value)
        
    db.commit()
    db.refresh(service)
    return service

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