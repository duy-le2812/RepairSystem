from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
import re

# ==========================================
# 1. SCHEMAS CHO BẢNG USERS (Người dùng)
# ==========================================
class UserBase(BaseModel):
    username: str
    role: str = "customer"
    full_name: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str  # Frontend gửi password gốc, Backend sẽ tự mã hóa (hash) sau

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str
    password: str = Field(..., min_length=6)
    confirm_password: str
    full_name: str
    phone: str

    @field_validator("email")
    def validate_email(cls, v):
        if not re.match(r"[^@]+@[^@]+\.[^@]+", v):
            raise ValueError("Định dạng email không hợp lệ")
        return v

    @model_validator(mode="after")
    def check_passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Mật khẩu và Nhập lại mật khẩu không khớp")
        return self

class UserResponse(UserBase):
    id: int
    email: Optional[str] = None
    created_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = None
    phone: Optional[str] = None

    @field_validator("full_name")
    def validate_full_name(cls, v):
        if v is not None:
            v_str = v.strip()
            if not v_str:
                raise ValueError("Họ tên không được để trống!")
            if len(v_str) > 100:
                raise ValueError("Họ tên không được vượt quá 100 ký tự!")
            return v_str
        return v

    @field_validator("email")
    def validate_email(cls, v):
        if v is not None and v.strip() != "":
            if not re.match(r"[^@]+@[^@]+\.[^@]+", v.strip()):
                raise ValueError("Email không đúng định dạng!")
            return v.strip()
        return v

    @field_validator("phone")
    def validate_phone(cls, v):
        if v is not None and v.strip() != "":
            v_clean = v.strip().replace(' ', '').replace('-', '')
            if not re.match(r"^\d{10,11}$", v_clean):
                raise ValueError("Số điện thoại phải chỉ chứa chữ số (10-11 số) và không chứa ký tự chữ!")
            return v_clean
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)
    confirm_password: str

    @model_validator(mode="after")
    def check_passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Mật khẩu mới và Nhập lại mật khẩu không khớp")
        return self


# ==========================================
# 2. SCHEMAS CHO BẢNG DEVICES (Thiết bị)
# ==========================================
class DeviceBase(BaseModel):
    device_type: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None

class DeviceCreate(DeviceBase):
    user_id: int

class DeviceResponse(DeviceBase):
    id: int
    user_id: int
    
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 3. SCHEMAS CHO BẢNG SERVICES (Dịch vụ)
# ==========================================
class ServiceBase(BaseModel):
    service_name: str
    description: Optional[str] = None
    base_price: Decimal

class ServiceCreate(ServiceBase):
    pass

class ServiceResponse(ServiceBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 4. SCHEMAS CHO BẢNG TICKET_DETAILS (Chi tiết phiếu)
# ==========================================
class TicketDetailBase(BaseModel):
    actual_price: Decimal

class TicketDetailCreate(TicketDetailBase):
    service_id: int
    # ticket_id sẽ được Backend tự động gắn vào khi tạo phiếu

class TicketDetailResponse(TicketDetailBase):
    id: int
    ticket_id: int
    service_id: int
    
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 5. SCHEMAS CHO BẢNG REPAIR_TICKETS (Phiếu sửa chữa)
# ==========================================
class RepairTicketBase(BaseModel):
    status: str = "TiepNhan"
    ai_diagnosis: Optional[str] = None
    admin_notes: Optional[str] = None

class RepairTicketCreate(RepairTicketBase):
    device_id: int
    # Khi tạo phiếu mới, có thể gửi kèm danh sách các dịch vụ cần làm ngay
    details: Optional[List[TicketDetailCreate]] = []

class RepairTicketResponse(RepairTicketBase):
    id: int
    device_id: int
    created_at: datetime
    # Trả về luôn danh sách chi tiết các dịch vụ trong phiếu này
    details: List[TicketDetailResponse] = []
    
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 6. SCHEMAS CHO BOOKING (Đặt lịch sửa chữa - Frontend)
# ==========================================
class BookingCreate(BaseModel):
    """
    Frontend gửi toàn bộ dữ liệu booking dưới dạng này.
    Backend tự tạo User, Device, RepairTicket.
    """
    customer_name: str
    phone_number: str
    device_type: str  # phone, tablet, laptop, watch, other
    brand: str
    device_model: str
    symptoms: str  # Triệu chứng/mô tả sự cố
    branch_id: Optional[str] = None  # Chi nhánh (optional)

class BookingResponse(BaseModel):
    """
    Backend trả về sau khi tạo thành công.
    Chứa thông tin User, Device, RepairTicket.
    """
    booking_id: str  # Order ID hoặc Ticket ID (định dạng FIX-XXXXX)
    user_id: int
    device_id: int
    ticket_id: int
    customer_name: str
    phone_number: str
    device_type: str
    brand: str
    device_model: str
    status: str  # Trạng thái phiếu (Tiếp nhận, Đang sửa, ...)
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 12. SCHEMAS CHO CHẨN ĐOÁN, BÁO GIÁ & LỊCH SỬ (TASK 28)
# ==========================================
class DiagnosisCreate(BaseModel):
    symptoms: Optional[str] = None
    inspection_result: str = Field(..., min_length=1)
    root_cause: str = Field(..., min_length=1)
    proposed_solution: str = Field(..., min_length=1)

class DiagnosisResponse(BaseModel):
    symptoms: Optional[str] = None
    inspection_result: Optional[str] = None
    root_cause: Optional[str] = None
    proposed_solution: Optional[str] = None
    diagnosed_at: Optional[datetime] = None
    diagnosed_by_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class QuotationItemCreate(BaseModel):
    part_name: str = Field(..., min_length=1)
    unit_price: Decimal = Field(..., ge=0)
    quantity: int = Field(1, ge=1)

class QuotationItemResponse(BaseModel):
    id: int
    quotation_id: int
    part_name: str
    unit_price: Decimal
    quantity: int
    subtotal: Decimal

    model_config = ConfigDict(from_attributes=True)

class QuotationCreate(BaseModel):
    labor_cost: Decimal = Field(Decimal(0), ge=0)
    additional_cost: Decimal = Field(Decimal(0), ge=0)
    warranty: Optional[str] = "6 tháng"
    notes: Optional[str] = None
    parts: List[QuotationItemCreate] = Field(..., min_length=1)

class QuotationResponse(BaseModel):
    id: int
    ticket_id: int
    labor_cost: Decimal
    additional_cost: Decimal
    total_amount: Decimal
    warranty: Optional[str] = None
    notes: Optional[str] = None
    customer_decision: str
    confirmed_by: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    items: List[QuotationItemResponse] = []

    model_config = ConfigDict(from_attributes=True)

class QuotationRespondRequest(BaseModel):
    decision: str = Field(..., pattern="^(approved|rejected)$")
    rejection_reason: Optional[str] = None
    customer_name: Optional[str] = None

class TicketHistoryResponse(BaseModel):
    id: int
    ticket_id: int
    status: str
    action: str
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 7. SCHEMAS CHO TRACKING (Timeline Event)
# ==========================================
class TimelineEventResponse(BaseModel):
    """Timeline event cho tracking"""
    status: str
    statusLabel: str
    timestamp: Optional[str] = None
    description: str
    isCompleted: bool

class TrackingResponse(BaseModel):
    """
    Response cho tracking search
    Maps RepairTicket + Device + User thành OrderItem format
    """
    id: str  # Order ID (FIX-XXXXX)
    customerName: str
    phoneNumber: str
    deviceType: str
    brand: str
    deviceModel: str
    symptoms: str
    branchId: Optional[str] = None
    status: str
    totalPrice: int = 0
    dateCreated: str
    technicianNotes: Optional[str] = None
    timeline: List[TimelineEventResponse] = []
    diagnosis: Optional[DiagnosisResponse] = None
    quotation: Optional[QuotationResponse] = None
    histories: List[TicketHistoryResponse] = []
    
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 8. SCHEMAS CHO CHATBOT (AI Chat)
# ==========================================
class ChatMessageRequest(BaseModel):
    """Request để gửi message tới chatbot"""
    message: str
    history: Optional[List[dict]] = []  # Lịch sử chat: [{"role": "user"|"assistant", "content": "..."}]

class ChatMessageResponse(BaseModel):
    """Response từ chatbot"""
    ai_response: str

# ==========================================
# 9. SCHEMAS CHO AUTHENTICATION (JWT)
# ==========================================
class LoginRequest(BaseModel):
    """Request để đăng nhập"""
    username: str
    password: str

class TokenResponse(BaseModel):
    """Response với JWT tokens"""
    access_token: str
    token_type: str
    user_id: int
    username: str
    role: str
    full_name: Optional[str] = None

class TokenData(BaseModel):
    """JWT Payload data"""
    username: Optional[str] = None
    user_id: Optional[int] = None

# ==========================================
# 10. SCHEMAS CHO CHI NHÁNH (Branches)
# ==========================================
class BranchBase(BaseModel):
    name: str
    address: str
    hotline: Optional[str] = None
    working_hours: Optional[str] = Field(None, serialization_alias="workingHours")
    map_url: Optional[str] = Field(None, serialization_alias="mapUrl")

class BranchResponse(BranchBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    hotline: Optional[str] = None
    working_hours: Optional[str] = Field(None, serialization_alias="workingHours")
    map_url: Optional[str] = Field(None, serialization_alias="mapUrl")

# ==========================================
# 11. SCHEMAS CHO ADMIN UPDATES
# ==========================================
class ServiceUpdate(BaseModel):
    service_name: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[Decimal] = None

class UserRoleUpdate(BaseModel):
    role: str

class TicketNoteUpdate(BaseModel):
    admin_notes: str