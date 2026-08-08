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
# ==========================================
# 2.5 SCHEMAS CHO SERVICE CATALOG (Task 03)
# ==========================================
class CategoryBase(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class CategoryResponse(CategoryBase):
    id: int
    slug: str
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class CategorySimple(BaseModel):
    id: int
    name: str
    slug: str
    model_config = ConfigDict(from_attributes=True)


class BrandBase(BaseModel):
    category_id: int
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None

class BrandCreate(BrandBase):
    pass

class BrandUpdate(BaseModel):
    category_id: Optional[int] = None
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class BrandResponse(BrandBase):
    id: int
    category_id: int
    name: str
    slug: str
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class BrandSimple(BaseModel):
    id: int
    name: str
    slug: str
    model_config = ConfigDict(from_attributes=True)


class DeviceModelBase(BaseModel):
    brand_id: int
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None

class DeviceModelCreate(DeviceModelBase):
    pass

class DeviceModelUpdate(BaseModel):
    brand_id: Optional[int] = None
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class DeviceModelResponse(DeviceModelBase):
    id: int
    brand_id: int
    name: str
    slug: str
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class DeviceModelSimple(BaseModel):
    id: int
    name: str
    slug: str
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 3. SCHEMAS CHO BẢNG SERVICES (Nâng cấp Task 03)
# ==========================================
class ServiceBase(BaseModel):
    service_name: str
    description: Optional[str] = None
    base_price: Decimal
    model_id: Optional[int] = None
    estimated_duration_minutes: Optional[int] = 60
    warranty_months: Optional[int] = 6

class ServiceCreate(ServiceBase):
    pass

class ServiceResponse(ServiceBase):
    id: int
    is_active: bool = True
    model: Optional[DeviceModelSimple] = None
    brand: Optional[BrandSimple] = None
    category: Optional[CategorySimple] = None

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
    appointment_date: Optional[str] = None  # Ngày hẹn (YYYY-MM-DD)
    appointment_time: Optional[str] = None  # Khung giờ hẹn

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
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    branch_id: Optional[str] = None
    branch_name: Optional[str] = None
    
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
    is_draft: Optional[bool] = False
    parts: List[QuotationItemCreate] = Field(default=[], min_length=0)

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
# 13. SCHEMAS CHO TECHNICIAN & REPAIR EXECUTION (TASK 06)
# ==========================================
class ActualPartUsedCreate(BaseModel):
    part_name: str = Field(..., min_length=1)
    unit_price: Decimal = Field(..., ge=0)
    quantity: int = Field(1, ge=1)

class ActualPartUsedResponse(BaseModel):
    id: int
    ticket_id: int
    part_name: str
    unit_price: Decimal
    quantity: int
    subtotal: Decimal
    model_config = ConfigDict(from_attributes=True)

class RepairExecutionUpdate(BaseModel):
    parts_used: Optional[List[ActualPartUsedCreate]] = []
    repair_result: Optional[str] = None

class QCCheckRequest(BaseModel):
    result: str = Field(..., pattern="^(passed|failed|PASS|FAIL)$")
    note: Optional[str] = None

class TechnicianAssignmentRequest(BaseModel):
    technician_id: int

# ==========================================
# 14. SCHEMAS CHO PAYMENT, INVOICE & HANDOVER (TASK 07)
# ==========================================
class PaymentRequest(BaseModel):
    amount: Decimal
    payment_method: str = Field(..., pattern="^(CASH|BANK_TRANSFER)$")
    transaction_reference: Optional[str] = None

class PaymentResponse(BaseModel):
    id: int
    ticket_id: int
    amount: Decimal
    payment_method: str
    payment_status: str
    transaction_reference: Optional[str] = None
    paid_at: datetime
    received_by_id: int
    model_config = ConfigDict(from_attributes=True)

class InvoiceResponse(BaseModel):
    id: int
    ticket_id: int
    invoice_number: str
    customer_name_snapshot: str
    phone_snapshot: str
    device_snapshot: str
    service_snapshot: Optional[str] = None
    warranty_snapshot: Optional[str] = None
    quotation_amount: Decimal
    total_amount: Decimal
    payment_method: str
    issued_at: datetime
    issued_by_id: int
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 15. SCHEMAS CHO DASHBOARD OVERVIEW (TASK 08)
# ==========================================
class DashboardSummaryResponse(BaseModel):
    total_tickets: int
    active_repairs: int
    waiting_customer: int
    ready_for_pickup: int
    completed: int
    total_customers: int
    revenue: Decimal

class StatusCountItem(BaseModel):
    status: str
    label: str
    count: int

class RevenueByDateItem(BaseModel):
    date: str
    revenue: Decimal

class DeviceStatItem(BaseModel):
    name: str
    count: int
    percentage: float

class BrandStatItem(BaseModel):
    name: str
    count: int

class ServiceStatItem(BaseModel):
    name: str
    count: int

class TechnicianPerformanceItem(BaseModel):
    technician_id: int
    technician_name: str
    assigned_count: int
    completed_count: int
    qc_passed_count: int
    qc_failed_count: int

class OutstandingTicketItem(BaseModel):
    ticket_code: str
    numeric_id: int
    device_model: str
    status: str
    status_label: str
    created_at: str
    aging_days: int

class RecentActivityItem(BaseModel):
    ticket_code: str
    action: str
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    details: Optional[str] = None
    timestamp: str

class DashboardOverviewResponse(BaseModel):
    summary: DashboardSummaryResponse
    status_distribution: List[StatusCountItem]
    revenue_by_date: List[RevenueByDateItem]
    popular_devices: List[DeviceStatItem]
    popular_brands: List[BrandStatItem]
    popular_services: List[ServiceStatItem]
    technician_performance: List[TechnicianPerformanceItem]
    outstanding_tickets: List[OutstandingTicketItem]
    recent_activity: List[RecentActivityItem]

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
    branchName: Optional[str] = None
    appointmentDate: Optional[str] = None
    appointmentTime: Optional[str] = None
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
    model_id: Optional[int] = None
    estimated_duration_minutes: Optional[int] = None
    warranty_months: Optional[int] = None
    is_active: Optional[bool] = None

class UserRoleUpdate(BaseModel):
    role: str

class TicketNoteUpdate(BaseModel):
    admin_notes: str