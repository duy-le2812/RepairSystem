from sqlalchemy.orm import Session
import bcrypt
from models import User

def initialize_admin(db: Session):
    admin = db.query(User).filter(User.role == "admin").first()
    if admin:
        print("Admin account already exists.")
        return
        
    existing_user = db.query(User).filter(User.username == "admin").first()
    if existing_user:
        print("Username 'admin' is already taken.")
        return
    
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw("Admin@123".encode('utf-8'), salt).decode('utf-8')
    new_admin = User(
        username="admin",
        role="admin",
        password_hash=hashed_password,
        full_name="Administrator"
    )
    db.add(new_admin)
    db.commit()
    print("Initial admin account created.")
