import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

import models

db = SessionLocal()

print("Checking users...")
users = db.query(models.User).all()
print(f"Total Users: {len(users)}")
for u in users:
    print(f" - User {u.id}: {u.username} ({u.role})")

print("\nChecking devices...")
devices = db.query(models.Device).all()
print(f"Total Devices: {len(devices)}")
for d in devices:
    print(f" - Device {d.id}: User {d.user_id}, {d.brand} {d.model}")

print("\nChecking tickets...")
tickets = db.query(models.RepairTicket).all()
print(f"Total Tickets: {len(tickets)}")
for t in tickets:
    print(f" - Ticket {t.id}: Device {t.device_id}, Status {t.status}")

db.close()
