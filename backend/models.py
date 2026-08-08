from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=True)
    password_hash = Column(String(255))
    role = Column(String(20), default="customer") # admin hoặc customer
    full_name = Column(String(100))
    phone = Column(String(15))
    created_at = Column(DateTime, default=datetime.utcnow)

    devices = relationship("Device", back_populates="owner")


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    device_type = Column(String(50))
    brand = Column(String(50))
    model = Column(String(100))

    owner = relationship("User", back_populates="devices")
    tickets = relationship("RepairTicket", back_populates="device")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    brands = relationship("Brand", back_populates="category", cascade="all, delete-orphan")

class Brand(Base):
    __tablename__ = "brands"
    __table_args__ = (
        UniqueConstraint('category_id', 'name', name='uix_brand_category_name'),
        UniqueConstraint('category_id', 'slug', name='uix_brand_category_slug'),
    )

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("Category", back_populates="brands")
    models = relationship("DeviceModel", back_populates="brand", cascade="all, delete-orphan")

class DeviceModel(Base):
    __tablename__ = "device_models"
    __table_args__ = (
        UniqueConstraint('brand_id', 'name', name='uix_model_brand_name'),
        UniqueConstraint('brand_id', 'slug', name='uix_model_brand_slug'),
    )

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    brand = relationship("Brand", back_populates="models")
    services = relationship("Service", back_populates="device_model")

class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String(100))
    description = Column(Text, nullable=True)
    base_price = Column(Numeric(18, 2))

    # Nâng cấp Service Catalog (Task 03)
    model_id = Column(Integer, ForeignKey("device_models.id"), nullable=True, index=True)
    estimated_duration_minutes = Column(Integer, default=60, nullable=True)
    warranty_months = Column(Integer, default=6, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    device_model = relationship("DeviceModel", back_populates="services")

class RepairTicket(Base):
    __tablename__ = "repair_tickets"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"))
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    technician_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    status = Column(String(50), default="TiepNhan")
    ai_diagnosis = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Lịch hẹn & Chẩn đoán
    appointment_date = Column(String(50), nullable=True)
    appointment_time = Column(String(50), nullable=True)
    symptoms = Column(Text, nullable=True) # Mô tả lỗi khách cung cấp
    inspection_result = Column(Text, nullable=True) # Kết quả kiểm tra
    root_cause = Column(Text, nullable=True) # Nguyên nhân
    proposed_solution = Column(Text, nullable=True) # Hướng sửa chữa đề xuất
    diagnosed_at = Column(DateTime, nullable=True)
    diagnosed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Quá trình thực hiện sửa chữa (Task 06)
    repair_started_at = Column(DateTime, nullable=True)
    repair_completed_at = Column(DateTime, nullable=True)
    repair_started_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    repair_completed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    repair_result = Column(Text, nullable=True)

    # Kiểm tra chất lượng (QC)
    qc_status = Column(String(20), default="NONE", nullable=True) # NONE, PENDING, PASSED, FAILED
    qc_note = Column(Text, nullable=True)
    qc_checked_at = Column(DateTime, nullable=True)
    qc_checked_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Trả máy & Giao nhận (Task 07)
    handover_at = Column(DateTime, nullable=True)
    handed_over_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    device = relationship("Device", back_populates="tickets")
    branch = relationship("Branch", back_populates="tickets")
    technician = relationship("User", foreign_keys=[technician_id])
    handed_over_by = relationship("User", foreign_keys=[handed_over_by_id])
    details = relationship("TicketDetail", back_populates="ticket")
    quotation = relationship("Quotation", back_populates="ticket", uselist=False)
    payment = relationship("Payment", back_populates="ticket", uselist=False)
    invoice = relationship("Invoice", back_populates="ticket", uselist=False)
    histories = relationship("TicketHistory", back_populates="ticket", order_by="TicketHistory.created_at.desc()")
    actual_parts = relationship("ActualPartUsed", back_populates="ticket", cascade="all, delete-orphan")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("repair_tickets.id"), unique=True, index=True, nullable=False)
    amount = Column(Numeric(18, 2), nullable=False)
    payment_method = Column(String(20), nullable=False) # CASH, BANK_TRANSFER
    payment_status = Column(String(20), default="PAID", nullable=False) # UNPAID, PAID
    transaction_reference = Column(String(100), nullable=True)
    paid_at = Column(DateTime, default=datetime.utcnow)
    received_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship("RepairTicket", back_populates="payment")
    received_by = relationship("User", foreign_keys=[received_by_id])

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("repair_tickets.id"), unique=True, index=True, nullable=False)
    invoice_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_name_snapshot = Column(String(100), nullable=False)
    phone_snapshot = Column(String(15), nullable=False)
    device_snapshot = Column(String(150), nullable=False)
    service_snapshot = Column(Text, nullable=True)
    warranty_snapshot = Column(String(100), nullable=True)
    quotation_amount = Column(Numeric(18, 2), nullable=False)
    total_amount = Column(Numeric(18, 2), nullable=False)
    payment_method = Column(String(20), nullable=False)
    issued_at = Column(DateTime, default=datetime.utcnow)
    issued_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    ticket = relationship("RepairTicket", back_populates="invoice")
    issued_by = relationship("User", foreign_keys=[issued_by_id])

class ActualPartUsed(Base):
    __tablename__ = "actual_parts_used"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("repair_tickets.id"), index=True)
    part_name = Column(String(150), nullable=False)
    unit_price = Column(Numeric(18, 2), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    subtotal = Column(Numeric(18, 2), nullable=False)

    ticket = relationship("RepairTicket", back_populates="actual_parts")

class TicketDetail(Base):
    __tablename__ = "ticket_details"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("repair_tickets.id"))
    service_id = Column(Integer, ForeignKey("services.id"))
    actual_price = Column(Numeric(18, 2))

    ticket = relationship("RepairTicket", back_populates="details")

class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("repair_tickets.id"), unique=True, index=True)
    labor_cost = Column(Numeric(18, 2), default=0)
    additional_cost = Column(Numeric(18, 2), default=0)
    total_amount = Column(Numeric(18, 2), default=0)
    warranty = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    confirmed_by = Column(String(100), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    customer_decision = Column(String(20), default="pending") # pending, approved, rejected
    rejection_reason = Column(Text, nullable=True)

    ticket = relationship("RepairTicket", back_populates="quotation")
    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")

class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"))
    part_name = Column(String(150))
    unit_price = Column(Numeric(18, 2))
    quantity = Column(Integer, default=1)
    subtotal = Column(Numeric(18, 2))

    quotation = relationship("Quotation", back_populates="items")

class TicketHistory(Base):
    __tablename__ = "ticket_histories"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("repair_tickets.id"))
    status = Column(String(50))
    action = Column(String(100))
    actor_name = Column(String(100), nullable=True)
    actor_role = Column(String(20), nullable=True) # admin, customer, system
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship("RepairTicket", back_populates="histories")

class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    address = Column(Text)
    hotline = Column(String(20), nullable=True)
    working_hours = Column(String(100), nullable=True)
    map_url = Column(Text, nullable=True)

    tickets = relationship("RepairTicket", back_populates="branch")

