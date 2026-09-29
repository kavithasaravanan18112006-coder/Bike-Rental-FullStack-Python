from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text, create_engine, func
from sqlalchemy.orm import Session, declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
FRONTEND_DIR = ROOT_DIR / "frontend"
DB_DIR = BASE_DIR / "data"
DB_DIR.mkdir(exist_ok=True)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_DIR / 'bikerental.db'}")
SECRET_KEY = os.getenv("SECRET_KEY", "bikerental-local-secret-change-in-production")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(40), default="Customer")
    status = Column(String(30), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)


class Bike(Base):
    __tablename__ = "bikes"
    id = Column(Integer, primary_key=True)
    code = Column(String(30), unique=True, nullable=False)
    number = Column(String(50), nullable=False)
    type = Column(String(60), nullable=False)
    location = Column(String(120), nullable=False)
    battery = Column(Integer, default=100)
    status = Column(String(30), default="Available")
    price = Column(Float, default=100)


class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True)
    booking_code = Column(String(40), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bike_id = Column(Integer, ForeignKey("bikes.id"), nullable=False)
    customer = Column(String(120), nullable=False)
    start_date = Column(Date, nullable=False)
    hours = Column(Integer, nullable=False)
    pickup_location = Column(String(120), nullable=False)
    total = Column(Float, nullable=False)
    status = Column(String(30), default="Confirmed")
    created_at = Column(DateTime, default=datetime.utcnow)


class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    reference = Column(String(120), nullable=False)
    method = Column(String(30), default="Demo")
    amount = Column(Float, nullable=False)
    status = Column(String(30), default="Paid")
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(160), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Maintenance(Base):
    __tablename__ = "maintenance"
    id = Column(Integer, primary_key=True)
    bike_id = Column(Integer, ForeignKey("bikes.id"), nullable=False)
    issue = Column(String(255), nullable=False)
    priority = Column(String(30), default="Medium")
    status = Column(String(30), default="Open")
    reported_on = Column(Date, default=date.today)


class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bike_id = Column(Integer, ForeignKey("bikes.id"), nullable=False)
    rating = Column(Float, nullable=False)
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(engine)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 180000)
    return f"{salt.hex()}:{digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, digest_hex = stored.split(":", 1)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), 180000)
        return hmac.compare_digest(digest.hex(), digest_hex)
    except Exception:
        return False


def b64e(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def b64d(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * ((4 - len(data) % 4) % 4))


def make_token(user: User) -> str:
    header = b64e(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = b64e(json.dumps({"sub": user.id, "role": user.role, "exp": int((datetime.utcnow() + timedelta(hours=12)).timestamp())}, separators=(",", ":")).encode())
    message = f"{header}.{payload}".encode()
    signature = hmac.new(SECRET_KEY.encode(), message, hashlib.sha256).digest()
    return f"{header}.{payload}.{b64e(signature)}"


def decode_token(token: str) -> dict:
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid token")
    message = f"{parts[0]}.{parts[1]}".encode()
    expected = hmac.new(SECRET_KEY.encode(), message, hashlib.sha256).digest()
    if not hmac.compare_digest(expected, b64d(parts[2])):
        raise ValueError("Invalid token")
    payload = json.loads(b64d(parts[1]).decode())
    if int(payload.get("exp", 0)) < int(datetime.utcnow().timestamp()):
        raise ValueError("Token expired")
    return payload


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


bearer = HTTPBearer(auto_error=False)


def auth(credentials: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not credentials:
        raise HTTPException(401, "Authentication required")
    try:
        payload = decode_token(credentials.credentials)
        user = db.get(User, int(payload["sub"]))
    except Exception:
        raise HTTPException(401, "Invalid or expired token")
    if not user or user.status != "Active":
        raise HTTPException(401, "User is inactive")
    return user


def admin(user: User) -> None:
    if user.role not in {"Admin", "Administrator"}:
        raise HTTPException(403, "Admin access required")


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=4, max_length=128)
    role: str = "Customer"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class BookingIn(BaseModel):
    bike_id: int
    start_date: date
    hours: int = Field(ge=1, le=72)
    pickup_location: str = Field(min_length=2, max_length=120)


class PaymentIn(BaseModel):
    booking_id: str
    reference: str = Field(min_length=2, max_length=120)
    method: str = "Demo"


class UserIn(BaseModel):
    name: str
    email: EmailStr
    role: str = "Customer"
    status: str = "Active"


class ProfileIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class BikeIn(BaseModel):
    number: str
    type: str
    location: str
    battery: int = Field(default=100, ge=0, le=100)
    status: str = "Available"
    price: float = Field(gt=0)


class MaintenanceIn(BaseModel):
    bike_id: int
    issue: str = Field(min_length=2, max_length=255)
    priority: str = "Medium"


class ReviewIn(BaseModel):
    bike_id: int
    rating: float = Field(ge=1, le=5)
    comment: str = Field(min_length=2, max_length=1000)


class SettingsIn(BaseModel):
    platform_name: str = "BikeRental"
    default_location: str = "Chennai, Tamil Nadu"
    email_notifications: bool = True
    gps_tracking: bool = True


app = FastAPI(title="BikeRental API", version="2.0.0", docs_url="/api/docs", redoc_url="/api/redoc")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.get("/api/health")
def health():
    return {"status": "ok", "database": "connected"}


@app.post("/api/auth/register")
def register(data: RegisterIn, db: Session = Depends(get_db)):
    email = str(data.email).lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "Email already registered")
    role = data.role if data.role in {"Customer", "Bike Owner"} else "Customer"
    user = User(name=data.name.strip(), email=email, password_hash=hash_password(data.password), role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"access_token": make_token(user), "token_type": "bearer", "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role}}


@app.post("/api/auth/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == str(data.email).lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    if user.status != "Active":
        raise HTTPException(403, "Account is blocked")
    return {"access_token": make_token(user), "token_type": "bearer", "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role}}


@app.get("/api/me")
def me(user: User = Depends(auth)):
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "status": user.status}


@app.get("/api/bikes")
def list_bikes(_: User = Depends(auth), db: Session = Depends(get_db)):
    return [{"id": b.id, "code": b.code, "number": b.number, "type": b.type, "location": b.location, "battery": b.battery, "status": b.status, "price": b.price} for b in db.query(Bike).order_by(Bike.id).all()]


@app.post("/api/bikes")
def create_bike(data: BikeIn, user: User = Depends(auth), db: Session = Depends(get_db)):
    admin(user)
    code = f"BR-{secrets.randbelow(9000) + 1000}"
    bike = Bike(code=code, number=data.number, type=data.type, location=data.location, battery=data.battery, status=data.status, price=data.price)
    db.add(bike); db.commit(); db.refresh(bike)
    return {"id": bike.id, "code": bike.code, "message": "Bike added"}


@app.delete("/api/bikes/{bike_id}")
def delete_bike(bike_id: int, user: User = Depends(auth), db: Session = Depends(get_db)):
    admin(user)
    bike = db.get(Bike, bike_id)
    if not bike: raise HTTPException(404, "Bike not found")
    db.delete(bike); db.commit()
    return {"message": "Bike deleted"}


@app.get("/api/bookings")
def list_bookings(user: User = Depends(auth), db: Session = Depends(get_db)):
    query = db.query(Booking)
    if user.role not in {"Admin", "Administrator"}:
        query = query.filter(Booking.user_id == user.id)
    rows = []
    for b in query.order_by(Booking.created_at.desc()).all():
        bike = db.get(Bike, b.bike_id)
        rows.append({"id": b.booking_code, "customer": b.customer, "bike": bike.number if bike else "Deleted bike", "date": b.start_date.isoformat(), "hours": b.hours, "total": b.total, "status": b.status, "pickup_location": b.pickup_location, "bike_id": b.bike_id})
    return rows


@app.post("/api/bookings")
def create_booking(data: BookingIn, user: User = Depends(auth), db: Session = Depends(get_db)):
    bike = db.get(Bike, data.bike_id)
    if not bike: raise HTTPException(404, "Bike not found")
    if bike.status != "Available": raise HTTPException(409, f"Bike is not available ({bike.status})")
    code = f"#BK{1000 + db.query(Booking).count() + 1}"
    booking = Booking(booking_code=code, user_id=user.id, bike_id=bike.id, customer=user.name, start_date=data.start_date, hours=data.hours, pickup_location=data.pickup_location, total=round(bike.price * data.hours, 2), status="Confirmed")
    if data.start_date == date.today(): bike.status = "On Ride"
    db.add(booking)
    db.add(Notification(user_id=user.id, title="Booking confirmed", message=f"{code} confirmed for {bike.number}."))
    db.commit(); db.refresh(booking)
    return {"id": code, "customer": user.name, "bike": bike.number, "date": data.start_date.isoformat(), "hours": data.hours, "total": booking.total, "status": booking.status}


@app.post("/api/payments")
def create_payment(data: PaymentIn, user: User = Depends(auth), db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.booking_code == data.booking_id).first()
    if not booking and data.booking_id.isdigit(): booking = db.get(Booking, int(data.booking_id))
    if not booking: raise HTTPException(404, "Booking not found")
    if user.role not in {"Admin", "Administrator"} and booking.user_id != user.id: raise HTTPException(403, "Not your booking")
    payment = Payment(booking_id=booking.id, reference=data.reference, method=data.method, amount=booking.total, status="Paid")
    booking.status = "Paid"
    db.add(payment)
    db.add(Notification(user_id=booking.user_id, title="Payment successful", message=f"Payment of ₹{booking.total:.2f} recorded."))
    db.commit()
    return {"status": "Paid", "amount": booking.total, "reference": data.reference}


@app.get("/api/users")
def list_users(user: User = Depends(auth), db: Session = Depends(get_db)):
    admin(user)
    return [{"id": x.id, "name": x.name, "email": x.email, "role": x.role, "status": x.status} for x in db.query(User).order_by(User.id).all()]


@app.post("/api/users")
def create_user(data: UserIn, user: User = Depends(auth), db: Session = Depends(get_db)):
    admin(user)
    email = str(data.email).lower()
    if db.query(User).filter(User.email == email).first(): raise HTTPException(409, "Email already exists")
    x = User(name=data.name, email=email, password_hash=hash_password("Welcome@123"), role=data.role, status=data.status)
    db.add(x); db.commit(); db.refresh(x)
    return {"id": x.id, "message": "User added", "temporary_password": "Welcome@123"}


@app.delete("/api/users/{user_id}")
def delete_user(user_id: int, user: User = Depends(auth), db: Session = Depends(get_db)):
    admin(user)
    target = db.get(User, user_id)
    if not target: raise HTTPException(404, "User not found")
    if target.id == user.id: raise HTTPException(400, "You cannot delete your own account")
    db.delete(target); db.commit()
    return {"message": "User deleted"}


@app.get("/api/notifications")
def list_notifications(user: User = Depends(auth), db: Session = Depends(get_db)):
    rows = db.query(Notification).filter((Notification.user_id == user.id) | (Notification.user_id.is_(None))).order_by(Notification.created_at.desc()).all()
    return [{"id": n.id, "title": n.title, "message": n.message, "read": bool(n.is_read), "created_at": n.created_at.isoformat()} for n in rows]


@app.post("/api/notifications/{nid}/read")
def read_notification(nid: int, user: User = Depends(auth), db: Session = Depends(get_db)):
    n = db.get(Notification, nid)
    if not n or (n.user_id is not None and n.user_id != user.id): raise HTTPException(404, "Notification not found")
    n.is_read = True; db.commit()
    return {"message": "Marked as read"}


@app.get("/api/analytics")
def analytics(user: User = Depends(auth), db: Session = Depends(get_db)):
    admin(user)
    revenue = float(db.query(func.coalesce(func.sum(Payment.amount), 0)).scalar() or 0)
    return {"total_users": db.query(User).count(), "total_bikes": db.query(Bike).count(), "active_rentals": db.query(Booking).filter(Booking.status.in_(["Confirmed", "Paid"])).count(), "total_bookings": db.query(Booking).count(), "revenue": revenue}


@app.get("/api/tracking")
def tracking(user: User = Depends(auth), db: Session = Depends(get_db)):
    admin(user)
    return [{"bike": b.number, "location": b.location, "battery": b.battery, "speed": 25, "status": b.status} for b in db.query(Bike).filter(Bike.status == "On Ride").all()]


@app.get("/api/maintenance")
def list_maintenance(user: User = Depends(auth), db: Session = Depends(get_db)):
    admin(user)
    rows = db.query(Maintenance).order_by(Maintenance.id.desc()).all()
    return [{"id": m.id, "bike": db.get(Bike, m.bike_id).number if db.get(Bike, m.bike_id) else "Deleted bike", "issue": m.issue, "priority": m.priority, "status": m.status, "reported_on": m.reported_on.isoformat()} for m in rows]


@app.post("/api/maintenance")
def create_maintenance(data: MaintenanceIn, user: User = Depends(auth), db: Session = Depends(get_db)):
    admin(user)
    if not db.get(Bike, data.bike_id): raise HTTPException(404, "Bike not found")
    item = Maintenance(bike_id=data.bike_id, issue=data.issue, priority=data.priority)
    db.add(item); db.commit(); db.refresh(item)
    return {"id": item.id, "message": "Maintenance issue created"}


@app.get("/api/reviews")
def list_reviews(user: User = Depends(auth), db: Session = Depends(get_db)):
    rows = db.query(Review).order_by(Review.created_at.desc()).all()
    return [{"id": r.id, "rating": r.rating, "comment": r.comment, "bike": db.get(Bike, r.bike_id).number if db.get(Bike, r.bike_id) else "Deleted bike", "created_at": r.created_at.isoformat()} for r in rows]


@app.post("/api/reviews")
def create_review(data: ReviewIn, user: User = Depends(auth), db: Session = Depends(get_db)):
    if not db.get(Bike, data.bike_id): raise HTTPException(404, "Bike not found")
    review = Review(user_id=user.id, bike_id=data.bike_id, rating=data.rating, comment=data.comment)
    db.add(review); db.commit(); db.refresh(review)
    return {"id": review.id, "message": "Review submitted"}


@app.put("/api/profile")
def update_profile(data: ProfileIn, user: User = Depends(auth), db: Session = Depends(get_db)):
    user.name = data.name.strip(); db.commit()
    return {"message": "Profile updated", "name": user.name}


SETTINGS = {"platform_name": "BikeRental", "default_location": "Chennai, Tamil Nadu", "email_notifications": True, "gps_tracking": True}


@app.get("/api/settings")
def get_settings(_: User = Depends(auth)):
    return SETTINGS


@app.put("/api/settings")
def update_settings(data: SettingsIn, user: User = Depends(auth)):
    admin(user); SETTINGS.update(data.model_dump()); return SETTINGS


SEED_BIKES = [
    ("BR-001", "HR26 AB 1234", "Electric Bike", "Anna Nagar", 75, "Available", 180),
    ("BR-002", "TN09 CD 5678", "City Bike", "T. Nagar", 60, "Available", 150),
    ("BR-003", "KA05 EF 9012", "Electric Bike", "Nungambakkam", 80, "On Ride", 220),
    ("BR-004", "MH12 GH 3456", "Mountain Bike", "Velachery", 55, "Available", 200),
    ("BR-005", "TN07 IJ 7890", "City Bike", "Adyar", 90, "Maintenance", 160),
    ("BR-006", "TN10 KL 2468", "Electric Bike", "Anna Nagar", 88, "Available", 220),
]

def seed():
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.email == "admin@bikerental.com").first()
        if not admin_user:
            admin_user = User(name="Admin User", email="admin@bikerental.com", password_hash=hash_password("Admin@123"), role="Admin", status="Active")
            db.add(admin_user); db.flush()

        # Always repair missing demo bikes. This prevents an existing/partially-used
        # database from leaving the Booking select box empty.
        existing_codes = {x.code for x in db.query(Bike).all()}
        missing = [Bike(code=a, number=b, type=c, location=d, battery=e, status=f, price=g)
                   for a,b,c,d,e,f,g in SEED_BIKES if a not in existing_codes]
        if missing:
            db.add_all(missing)

        if db.query(Notification).count() == 0:
            now = datetime.utcnow()
            demo_notifications = [
                ("New booking received", "A customer booked HR26 AB 1234 for 2 hours.", 0),
                ("Payment completed", "Payment for booking #BK1001 was completed successfully.", 8),
                ("Low battery alert", "Bike TN07 IJ 7890 battery is below the recommended level.", 15),
                ("Geo-fence alert", "Bike HR26 AB 1234 moved outside the Anna Nagar zone.", 22),
                ("Bike maintenance due", "Bike TN07 IJ 7890 is scheduled for maintenance.", 60),
                ("New user registered", "A new customer joined the BikeRental platform.", 120),
            ]
            for title, message, minutes in demo_notifications:
                db.add(Notification(user_id=admin_user.id, title=title, message=message, created_at=now - timedelta(minutes=minutes)))
        db.commit()
    finally:
        db.close()


seed()

# The API routes are registered first. Static files are mounted last so /api/* is never intercepted by the frontend server.
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
