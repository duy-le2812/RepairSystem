from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, ForeignKey
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

class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String(100))
    description = Column(Text)
    base_price = Column(Numeric(18, 2))

class RepairTicket(Base):
    __tablename__ = "repair_tickets"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"))
    status = Column(String(50), default="TiepNhan")
    ai_diagnosis = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Chẩn đoán
    symptoms = Column(Text, nullable=True) # Mô tả lỗi khách cung cấp
    inspection_result = Column(Text, nullable=True) # Kết quả kiểm tra
    root_cause = Column(Text, nullable=True) # Nguyên nhân
    proposed_solution = Column(Text, nullable=True) # Hướng sửa chữa đề xuất
    diagnosed_at = Column(DateTime, nullable=True)
    diagnosed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    device = relationship("Device", back_populates="tickets")
    details = relationship("TicketDetail", back_populates="ticket")
    quotation = relationship("Quotation", back_populates="ticket", uselist=False)
    histories = relationship("TicketHistory", back_populates="ticket", order_by="TicketHistory.created_at.desc()")

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
