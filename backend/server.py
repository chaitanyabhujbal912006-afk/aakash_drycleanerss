"""Aakash Drycleaners – WashFlow ERP backend.

Fastapi + Motor (MongoDB) implementation of the full order lifecycle,
verification checkpoints, invoicing, complaints and an AI assistant
powered by Claude Sonnet via emergentintegrations.
"""
from __future__ import annotations

import io
import logging
import os
import random
import string
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

from pdf_gen import build_invoice_pdf

# ---------------------------------------------------------------------------
# Bootstrap
# ---------------------------------------------------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_EXPIRES_MINUTES = int(os.environ.get("JWT_EXPIRES_MINUTES", "1440"))
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
BUSINESS = {
    "name": os.environ.get("BUSINESS_NAME", "Aakash Drycleaners"),
    "address": os.environ.get("BUSINESS_ADDRESS", ""),
    "gstin": os.environ.get("BUSINESS_GSTIN", ""),
    "phone": os.environ.get("BUSINESS_PHONE", ""),
    "email": os.environ.get("BUSINESS_EMAIL", ""),
}

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="WashFlow ERP – Aakash Drycleaners")
api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
log = logging.getLogger("washflow")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def gen_id() -> str:
    return str(uuid.uuid4())


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRES_MINUTES),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def gen_otp() -> str:
    return f"{random.randint(0, 999999):06d}"


def strip_id(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


async def current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_role(*roles: str):
    async def _dep(user: dict = Depends(current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail=f"Requires role: {roles}")
        return user
    return _dep


async def next_sequence(name: str, start: int) -> int:
    doc = await db.counters.find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = doc.get("seq", 1)
    # Ensure we start above `start`
    if seq < start:
        await db.counters.update_one({"_id": name}, {"$set": {"seq": start}})
        return start
    return seq


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
ROLES = {"admin", "delivery", "client"}
STATUSES = ["pending", "assigned", "picked_up", "at_shop", "washing",
            "ironing", "ready", "out_for_delivery", "delivered", "cancelled"]


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    phone: str
    role: str = "client"
    address: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ServiceUpsert(BaseModel):
    name: str
    category: str  # Gents / Ladies / Kids / Household
    service_type: str  # Washing / Dry Cleaning / Ironing
    rate_paise: int  # store money in paise
    active: bool = True


class OrderItemIn(BaseModel):
    service_id: str
    quantity: int = Field(ge=1)


class OrderCreateIn(BaseModel):
    items: list[OrderItemIn]
    pickup_address: str
    pickup_slot: str  # human string e.g. "Today 5pm-7pm"
    notes: Optional[str] = None


class AssignIn(BaseModel):
    delivery_user_id: str
    pickup_slot: Optional[str] = None


class StatusIn(BaseModel):
    status: str


class PickupCountItem(BaseModel):
    category: str
    count: int
    notes: Optional[str] = None


class PickupCountIn(BaseModel):
    items: list[PickupCountItem]
    photo_urls: list[str] = []
    driver_notes: Optional[str] = None


class OtpVerifyIn(BaseModel):
    otp: str


class ShopReceiptIn(BaseModel):
    actual_items: list[PickupCountItem]
    photo_urls: list[str] = []
    mismatch_notes: Optional[str] = None


class ComplaintIn(BaseModel):
    order_id: Optional[str] = None
    subject: str
    message: str


class ChatIn(BaseModel):
    session_id: str
    message: str


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
@api.post("/auth/register")
async def register(body: RegisterIn):
    if body.role not in ROLES:
        raise HTTPException(400, "Invalid role")
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    user = {
        "id": gen_id(),
        "email": body.email.lower(),
        "password_hash": hash_password(body.password),
        "name": body.name,
        "phone": body.phone,
        "role": body.role,
        "address": body.address,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = make_token(user["id"], user["role"])
    return {"token": token, "user": {k: user[k] for k in ("id", "email", "name", "phone", "role", "address")}}


@api.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = make_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {k: user[k] for k in ("id", "email", "name", "phone", "role", "address")},
    }


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return user


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
@api.get("/users")
async def list_users(role: Optional[str] = None, admin: dict = Depends(require_role("admin"))):
    query: dict[str, Any] = {}
    if role:
        query["role"] = role
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(500)
    return users


# ---------------------------------------------------------------------------
# Services catalog
# ---------------------------------------------------------------------------
@api.get("/services")
async def list_services():
    services = await db.services.find({"active": True}, {"_id": 0}).to_list(500)
    return services


@api.post("/services")
async def create_service(body: ServiceUpsert, admin: dict = Depends(require_role("admin"))):
    svc = body.model_dump()
    svc["id"] = gen_id()
    svc["created_at"] = now_iso()
    await db.services.insert_one(svc)
    return strip_id(svc)


@api.patch("/services/{svc_id}")
async def update_service(svc_id: str, body: ServiceUpsert, admin: dict = Depends(require_role("admin"))):
    upd = body.model_dump()
    res = await db.services.find_one_and_update(
        {"id": svc_id}, {"$set": upd}, return_document=True
    )
    if not res:
        raise HTTPException(404, "Service not found")
    return strip_id(res)


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------
async def _price_items(items: list[OrderItemIn]) -> tuple[list[dict], int]:
    result: list[dict] = []
    subtotal = 0
    for it in items:
        svc = await db.services.find_one({"id": it.service_id}, {"_id": 0})
        if not svc:
            raise HTTPException(400, f"Service {it.service_id} not found")
        line = {
            "id": gen_id(),
            "service_id": svc["id"],
            "service_name": svc["name"],
            "category": svc["category"],
            "service_type": svc["service_type"],
            "rate_paise": svc["rate_paise"],
            "quantity": it.quantity,
            "total_paise": svc["rate_paise"] * it.quantity,
        }
        subtotal += line["total_paise"]
        result.append(line)
    return result, subtotal


@api.post("/orders")
async def create_order(body: OrderCreateIn, user: dict = Depends(current_user)):
    if user["role"] not in ("client", "admin"):
        raise HTTPException(403, "Only clients place orders")
    items, subtotal = await _price_items(body.items)
    gst = round(subtotal * 0.18)
    total = subtotal + gst
    seq = await next_sequence("orders", 1001)
    order = {
        "id": gen_id(),
        "number": f"WF-{seq}",
        "client_id": user["id"],
        "client_name": user["name"],
        "client_phone": user["phone"],
        "pickup_address": body.pickup_address,
        "pickup_slot": body.pickup_slot,
        "notes": body.notes,
        "items": items,
        "subtotal_paise": subtotal,
        "gst_paise": gst,
        "total_paise": total,
        "status": "pending",
        "delivery_user_id": None,
        "delivery_user_name": None,
        "pickup_otp_hash": None,
        "delivery_otp_hash": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "history": [{"status": "pending", "at": now_iso(), "by": user["id"]}],
        "paid": False,
    }
    await db.orders.insert_one(order)
    return strip_id(order)


@api.get("/orders")
async def list_orders(status_f: Optional[str] = None, user: dict = Depends(current_user)):
    query: dict[str, Any] = {}
    if user["role"] == "client":
        query["client_id"] = user["id"]
    elif user["role"] == "delivery":
        query["delivery_user_id"] = user["id"]
    if status_f:
        query["status"] = status_f
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders


@api.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    if user["role"] == "client" and order["client_id"] != user["id"]:
        raise HTTPException(403, "Not your order")
    if user["role"] == "delivery" and order.get("delivery_user_id") != user["id"]:
        raise HTTPException(403, "Not assigned to you")
    return order


@api.patch("/orders/{order_id}/assign")
async def assign_order(order_id: str, body: AssignIn, admin: dict = Depends(require_role("admin"))):
    driver = await db.users.find_one({"id": body.delivery_user_id, "role": "delivery"})
    if not driver:
        raise HTTPException(404, "Delivery user not found")
    upd: dict[str, Any] = {
        "delivery_user_id": driver["id"],
        "delivery_user_name": driver["name"],
        "status": "assigned",
        "updated_at": now_iso(),
    }
    if body.pickup_slot:
        upd["pickup_slot"] = body.pickup_slot
    order = await db.orders.find_one_and_update(
        {"id": order_id},
        {"$set": upd, "$push": {"history": {"status": "assigned", "at": now_iso(), "by": admin["id"]}}},
        return_document=True,
    )
    if not order:
        raise HTTPException(404, "Order not found")
    await _notify(driver["id"], f"New order assigned: {order['number']}", order["id"])
    return strip_id(order)


@api.patch("/orders/{order_id}/status")
async def update_status(order_id: str, body: StatusIn, user: dict = Depends(current_user)):
    if body.status not in STATUSES:
        raise HTTPException(400, "Invalid status")
    if user["role"] not in ("admin", "delivery"):
        raise HTTPException(403, "Not allowed")
    order = await db.orders.find_one_and_update(
        {"id": order_id},
        {"$set": {"status": body.status, "updated_at": now_iso()},
         "$push": {"history": {"status": body.status, "at": now_iso(), "by": user["id"]}}},
        return_document=True,
    )
    if not order:
        raise HTTPException(404, "Order not found")
    # push notification to client
    await _notify(order["client_id"], f"Order {order['number']} → {body.status.replace('_',' ')}", order["id"])
    return strip_id(order)


# ---------------------------------------------------------------------------
# Verification checkpoints
# ---------------------------------------------------------------------------
@api.post("/orders/{order_id}/driver-count")
async def driver_count(order_id: str, body: PickupCountIn,
                       user: dict = Depends(require_role("delivery"))):
    order = await db.orders.find_one({"id": order_id})
    if not order or order.get("delivery_user_id") != user["id"]:
        raise HTTPException(403, "Not your task")
    log_doc = {
        "id": gen_id(),
        "order_id": order_id,
        "checkpoint": "driver_count",
        "verified_by": user["id"],
        "expected_count": sum(i["quantity"] for i in order["items"]),
        "actual_count": sum(i.count for i in body.items),
        "items": [i.model_dump() for i in body.items],
        "photo_urls": body.photo_urls,
        "notes": body.driver_notes,
        "at": now_iso(),
    }
    await db.verification_logs.insert_one(log_doc)
    log_doc.pop("_id", None)
    await db.orders.update_one({"id": order_id}, {"$set": {"driver_count": log_doc, "updated_at": now_iso()}})
    return log_doc


@api.post("/orders/{order_id}/send-pickup-otp")
async def send_pickup_otp(order_id: str, user: dict = Depends(current_user)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(404, "Order not found")
    if user["role"] == "client" and order["client_id"] != user["id"]:
        raise HTTPException(403, "Not your order")
    otp = gen_otp()
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"pickup_otp_hash": hash_password(otp), "pickup_otp_generated_at": now_iso()}},
    )
    # Mocked SMS — for demo we return OTP so client UI can display it.
    log.info(f"[MOCK SMS] pickup OTP for {order['number']} → {otp}")
    return {"otp": otp, "message": "OTP generated (mock SMS). Share with delivery agent."}


@api.post("/orders/{order_id}/verify-pickup-otp")
async def verify_pickup_otp(order_id: str, body: OtpVerifyIn,
                            user: dict = Depends(require_role("delivery"))):
    order = await db.orders.find_one({"id": order_id})
    if not order or order.get("delivery_user_id") != user["id"]:
        raise HTTPException(403, "Not your task")
    if not order.get("pickup_otp_hash") or not verify_password(body.otp, order["pickup_otp_hash"]):
        raise HTTPException(400, "Invalid OTP")
    await db.verification_logs.insert_one({
        "id": gen_id(),
        "order_id": order_id,
        "checkpoint": "pickup_otp",
        "verified_by": user["id"],
        "at": now_iso(),
    })
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": "picked_up", "pickup_otp_hash": None, "updated_at": now_iso()},
         "$push": {"history": {"status": "picked_up", "at": now_iso(), "by": user["id"]}}},
    )
    await _notify(order["client_id"], f"Pickup confirmed for {order['number']}", order_id)
    return {"ok": True}


@api.post("/orders/{order_id}/shop-receipt")
async def shop_receipt(order_id: str, body: ShopReceiptIn,
                       admin: dict = Depends(require_role("admin"))):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(404, "Order not found")
    expected = sum(i["quantity"] for i in order["items"])
    actual = sum(i.count for i in body.actual_items)
    mismatch = expected != actual
    log_doc = {
        "id": gen_id(),
        "order_id": order_id,
        "checkpoint": "shop_receipt",
        "verified_by": admin["id"],
        "expected_count": expected,
        "actual_count": actual,
        "mismatch": mismatch,
        "items": [i.model_dump() for i in body.actual_items],
        "photo_urls": body.photo_urls,
        "notes": body.mismatch_notes,
        "at": now_iso(),
    }
    await db.verification_logs.insert_one(log_doc)
    log_doc.pop("_id", None)
    new_status = "washing" if not mismatch else "at_shop"
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": new_status, "shop_receipt": log_doc, "updated_at": now_iso(),
                  "has_mismatch": mismatch},
         "$push": {"history": {"status": new_status, "at": now_iso(), "by": admin["id"]}}},
    )
    return log_doc


@api.post("/orders/{order_id}/send-delivery-otp")
async def send_delivery_otp(order_id: str, admin: dict = Depends(require_role("admin"))):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(404, "Order not found")
    otp = gen_otp()
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"delivery_otp_hash": hash_password(otp), "status": "out_for_delivery",
                  "updated_at": now_iso()},
         "$push": {"history": {"status": "out_for_delivery", "at": now_iso(), "by": admin["id"]}}},
    )
    log.info(f"[MOCK SMS] delivery OTP for {order['number']} → {otp}")
    await _notify(order["client_id"], f"Delivery OTP for {order['number']}: {otp}", order_id)
    return {"otp": otp, "message": "Delivery OTP sent (mock SMS)."}


@api.post("/orders/{order_id}/verify-delivery-otp")
async def verify_delivery_otp(order_id: str, body: OtpVerifyIn,
                              user: dict = Depends(require_role("delivery"))):
    order = await db.orders.find_one({"id": order_id})
    if not order or order.get("delivery_user_id") != user["id"]:
        raise HTTPException(403, "Not your task")
    if not order.get("delivery_otp_hash") or not verify_password(body.otp, order["delivery_otp_hash"]):
        raise HTTPException(400, "Invalid OTP")
    await db.verification_logs.insert_one({
        "id": gen_id(),
        "order_id": order_id,
        "checkpoint": "delivery_otp",
        "verified_by": user["id"],
        "at": now_iso(),
    })
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": "delivered", "delivery_otp_hash": None, "delivered_at": now_iso(),
                  "updated_at": now_iso()},
         "$push": {"history": {"status": "delivered", "at": now_iso(), "by": user["id"]}}},
    )
    await _notify(order["client_id"], f"Order {order['number']} delivered!", order_id)
    return {"ok": True}


@api.get("/orders/{order_id}/verification-logs")
async def order_logs(order_id: str, user: dict = Depends(current_user)):
    logs = await db.verification_logs.find({"order_id": order_id}, {"_id": 0}).sort("at", 1).to_list(200)
    return logs


# ---------------------------------------------------------------------------
# Invoices
# ---------------------------------------------------------------------------
@api.post("/invoices/generate/{order_id}")
async def generate_invoice(order_id: str, admin: dict = Depends(require_role("admin"))):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    existing = await db.invoices.find_one({"order_id": order_id}, {"_id": 0})
    if existing:
        return existing
    seq = await next_sequence("invoices", 1001)
    invoice = {
        "id": gen_id(),
        "number": f"INV-{seq}",
        "order_id": order_id,
        "order_number": order["number"],
        "client_id": order["client_id"],
        "client_name": order["client_name"],
        "client_phone": order["client_phone"],
        "items": order["items"],
        "subtotal_paise": order["subtotal_paise"],
        "cgst_paise": round(order["subtotal_paise"] * 0.09),
        "sgst_paise": round(order["subtotal_paise"] * 0.09),
        "gst_paise": order["gst_paise"],
        "total_paise": order["total_paise"],
        "status": "pending",
        "created_at": now_iso(),
        "business": BUSINESS,
    }
    await db.invoices.insert_one(invoice)
    return strip_id(invoice)


@api.get("/invoices")
async def list_invoices(user: dict = Depends(current_user)):
    query: dict[str, Any] = {}
    if user["role"] == "client":
        query["client_id"] = user["id"]
    elif user["role"] == "delivery":
        raise HTTPException(403, "Not allowed")
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return invoices


@api.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user: dict = Depends(current_user)):
    inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if user["role"] == "client" and inv["client_id"] != user["id"]:
        raise HTTPException(403, "Not your invoice")
    return inv


@api.get("/invoices/{invoice_id}/pdf")
async def invoice_pdf(invoice_id: str, token: Optional[str] = None):
    # Allow token via querystring so <a href> download works from browser.
    user = None
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        except jwt.PyJWTError:
            pass
    if not user:
        raise HTTPException(401, "Auth required (?token=...)")
    inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if user["role"] == "client" and inv["client_id"] != user["id"]:
        raise HTTPException(403, "Not your invoice")
    pdf_bytes = build_invoice_pdf(inv, BUSINESS)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{inv["number"]}.pdf"'},
    )


# ---------------------------------------------------------------------------
# Payments (mocked Razorpay)
# ---------------------------------------------------------------------------
@api.post("/payments/create-order/{invoice_id}")
async def payments_create(invoice_id: str, user: dict = Depends(current_user)):
    inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if user["role"] == "client" and inv["client_id"] != user["id"]:
        raise HTTPException(403, "Not your invoice")
    # MOCK — normally Razorpay create-order call
    rp_order_id = f"order_MOCK{uuid.uuid4().hex[:12]}"
    await db.invoices.update_one({"id": invoice_id}, {"$set": {"rp_order_id": rp_order_id}})
    return {
        "rp_order_id": rp_order_id,
        "amount": inv["total_paise"],
        "currency": "INR",
        "key_id": "rzp_test_MOCK",
    }


@api.post("/payments/verify/{invoice_id}")
async def payments_verify(invoice_id: str, user: dict = Depends(current_user)):
    """Mock verify — accepts any signature."""
    inv = await db.invoices.find_one_and_update(
        {"id": invoice_id},
        {"$set": {"status": "paid", "paid_at": now_iso()}},
        return_document=True,
    )
    if not inv:
        raise HTTPException(404, "Invoice not found")
    await db.orders.update_one({"id": inv["order_id"]}, {"$set": {"paid": True}})
    return {"ok": True, "status": "paid"}


# ---------------------------------------------------------------------------
# Complaints
# ---------------------------------------------------------------------------
@api.post("/complaints")
async def create_complaint(body: ComplaintIn, user: dict = Depends(current_user)):
    doc = {
        "id": gen_id(),
        "order_id": body.order_id,
        "client_id": user["id"],
        "client_name": user["name"],
        "subject": body.subject,
        "message": body.message,
        "status": "open",
        "created_at": now_iso(),
    }
    await db.complaints.insert_one(doc)
    return strip_id(doc)


@api.get("/complaints")
async def list_complaints(user: dict = Depends(current_user)):
    q: dict[str, Any] = {}
    if user["role"] == "client":
        q["client_id"] = user["id"]
    docs = await db.complaints.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------
async def _notify(user_id: str, message: str, ref: Optional[str] = None):
    await db.notifications.insert_one({
        "id": gen_id(),
        "user_id": user_id,
        "message": message,
        "ref_order_id": ref,
        "read": False,
        "at": now_iso(),
    })


@api.get("/notifications")
async def notifications(user: dict = Depends(current_user)):
    n = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("at", -1).to_list(200)
    return n


@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, user: dict = Depends(current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Dashboard stats
# ---------------------------------------------------------------------------
@api.get("/dashboard/stats")
async def dashboard_stats(admin: dict = Depends(require_role("admin"))):
    total_orders = await db.orders.count_documents({})
    active = await db.orders.count_documents({"status": {"$nin": ["delivered", "cancelled"]}})
    pending_pickups = await db.orders.count_documents({"status": {"$in": ["pending", "assigned"]}})
    mismatches = await db.orders.count_documents({"has_mismatch": True})

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_str = today.isoformat()
    revenue_agg = await db.invoices.aggregate([
        {"$match": {"status": "paid", "paid_at": {"$gte": today_str}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_paise"}}},
    ]).to_list(1)
    revenue_today = revenue_agg[0]["total"] if revenue_agg else 0

    # 7 day revenue chart
    seven_days = []
    for i in range(6, -1, -1):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        d_next = d + timedelta(days=1)
        agg = await db.invoices.aggregate([
            {"$match": {"status": "paid",
                        "paid_at": {"$gte": d.isoformat(), "$lt": d_next.isoformat()}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_paise"}}},
        ]).to_list(1)
        seven_days.append({
            "day": d.strftime("%a"),
            "date": d.strftime("%d %b"),
            "revenue_paise": agg[0]["total"] if agg else 0,
        })

    # status breakdown
    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    status_break = {row["_id"]: row["count"] async for row in db.orders.aggregate(pipeline)}

    # top drivers
    drivers = await db.users.find({"role": "delivery"}, {"_id": 0, "id": 1, "name": 1}).to_list(50)
    driver_stats = []
    for d in drivers:
        c = await db.orders.count_documents({"delivery_user_id": d["id"]})
        done = await db.orders.count_documents({"delivery_user_id": d["id"], "status": "delivered"})
        driver_stats.append({"id": d["id"], "name": d["name"], "assigned": c, "delivered": done})

    return {
        "active_orders": active,
        "total_orders": total_orders,
        "pending_pickups": pending_pickups,
        "mismatches": mismatches,
        "revenue_today_paise": revenue_today,
        "seven_days": seven_days,
        "status_breakdown": status_break,
        "drivers": sorted(driver_stats, key=lambda x: -x["delivered"]),
    }


# ---------------------------------------------------------------------------
# AI Chat (Claude Sonnet via emergentintegrations)
# ---------------------------------------------------------------------------
@api.post("/ai/chat")
async def ai_chat(body: ChatIn, user: dict = Depends(current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

    # context: if client, pull their recent orders
    context_lines: list[str] = []
    if user["role"] == "client":
        orders = await db.orders.find({"client_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
        for o in orders:
            context_lines.append(
                f"Order {o['number']} | status: {o['status']} | items: {sum(i['quantity'] for i in o['items'])} | total ₹{o['total_paise']/100:.0f} | slot: {o.get('pickup_slot','-')}"
            )
        system_msg = (
            f"You are the friendly support assistant for Aakash Drycleaners. The customer's name is {user['name']}. "
            f"Use the order data below to answer 'where are my clothes?' style questions with the exact stage. "
            f"Never invent orders. Reply in short, warm sentences. Use ₹ symbol for money.\n\n"
            f"RECENT ORDERS:\n" + ("\n".join(context_lines) or "No orders yet.")
        )
    else:
        # admin: operations helper. Provide simple aggregates.
        active = await db.orders.count_documents({"status": {"$nin": ["delivered", "cancelled"]}})
        mismatches = await db.orders.count_documents({"has_mismatch": True})
        pending = await db.orders.count_documents({"status": "pending"})
        system_msg = (
            "You are an operations copilot for Aakash Drycleaners admin. Give short, decisive answers. "
            f"CURRENT DATA: active_orders={active}, mismatches={mismatches}, unassigned={pending}."
        )

    # persist user message
    await db.chat_messages.insert_one({
        "id": gen_id(), "session_id": body.session_id, "user_id": user["id"],
        "role": "user", "content": body.message, "at": now_iso(),
    })

    async def gen():
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=body.session_id,
                system_message=system_msg,
            ).with_model("anthropic", "claude-sonnet-4-6")
            full = ""
            async for event in chat.stream_message(UserMessage(text=body.message)):
                if isinstance(event, TextDelta):
                    full += event.content
                    yield event.content
                elif isinstance(event, StreamDone):
                    break
            await db.chat_messages.insert_one({
                "id": gen_id(), "session_id": body.session_id, "user_id": user["id"],
                "role": "assistant", "content": full, "at": now_iso(),
            })
        except Exception as e:
            log.exception("AI chat error")
            yield f"\n\n[assistant error: {e}]"

    return StreamingResponse(gen(), media_type="text/plain",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api.get("/ai/history/{session_id}")
async def ai_history(session_id: str, user: dict = Depends(current_user)):
    msgs = await db.chat_messages.find(
        {"session_id": session_id, "user_id": user["id"]}, {"_id": 0}
    ).sort("at", 1).to_list(500)
    return msgs


# ---------------------------------------------------------------------------
# Business metadata + seed
# ---------------------------------------------------------------------------
@api.get("/business")
async def get_business():
    return BUSINESS


@api.post("/seed")
async def seed():
    """Idempotent seed: admin/delivery/client users + services + a demo order."""
    seeded = {}

    # Users
    users_to_seed = [
        {"email": "admin@aakash.in", "password": "admin123", "name": "Aakash Admin",
         "phone": "+919000000001", "role": "admin", "address": BUSINESS["address"]},
        {"email": "driver@aakash.in", "password": "driver123", "name": "Ravi Kumar",
         "phone": "+919000000002", "role": "delivery", "address": "Bengaluru"},
        {"email": "priya@example.com", "password": "priya123", "name": "Priya Sharma",
         "phone": "+919000000003", "role": "client", "address": "204, HSR Layout, Bengaluru"},
    ]
    for u in users_to_seed:
        existing = await db.users.find_one({"email": u["email"]})
        if not existing:
            doc = {
                "id": gen_id(), "email": u["email"].lower(),
                "password_hash": hash_password(u["password"]),
                "name": u["name"], "phone": u["phone"], "role": u["role"],
                "address": u["address"], "created_at": now_iso(),
            }
            await db.users.insert_one(doc)
            seeded[u["email"]] = "created"
        else:
            seeded[u["email"]] = "existed"

    # Services catalog
    services = [
        # Washing
        ("Shirt", "Gents", "Washing", 4500),
        ("Trouser", "Gents", "Washing", 5000),
        ("Kurti", "Ladies", "Washing", 5500),
        ("Saree", "Ladies", "Washing", 12000),
        ("Kids Set", "Kids", "Washing", 4000),
        ("Bedsheet", "Household", "Washing", 9000),
        # Dry cleaning
        ("Blazer", "Gents", "Dry Cleaning", 22000),
        ("Suit (2pc)", "Gents", "Dry Cleaning", 35000),
        ("Silk Saree", "Ladies", "Dry Cleaning", 28000),
        ("Lehenga", "Ladies", "Dry Cleaning", 55000),
        ("Curtain (pair)", "Household", "Dry Cleaning", 45000),
        # Ironing
        ("Shirt Iron", "Gents", "Ironing", 1500),
        ("Trouser Iron", "Gents", "Ironing", 1500),
        ("Saree Iron", "Ladies", "Ironing", 4000),
    ]
    existing_svc = await db.services.count_documents({})
    if existing_svc == 0:
        for name, cat, st, rate in services:
            await db.services.insert_one({
                "id": gen_id(), "name": name, "category": cat, "service_type": st,
                "rate_paise": rate, "active": True, "created_at": now_iso(),
            })
        seeded["services"] = f"{len(services)} inserted"
    else:
        seeded["services"] = f"already have {existing_svc}"

    # Demo order (only if none exist)
    if await db.orders.count_documents({}) == 0:
        client_doc = await db.users.find_one({"email": "priya@example.com"})
        driver = await db.users.find_one({"email": "driver@aakash.in"})
        svcs = await db.services.find({}, {"_id": 0}).to_list(20)
        picked = svcs[:3]
        items = []
        subtotal = 0
        for s in picked:
            qty = 2
            line = {
                "id": gen_id(), "service_id": s["id"], "service_name": s["name"],
                "category": s["category"], "service_type": s["service_type"],
                "rate_paise": s["rate_paise"], "quantity": qty,
                "total_paise": s["rate_paise"] * qty,
            }
            items.append(line); subtotal += line["total_paise"]
        gst = round(subtotal * 0.18)
        seq = await next_sequence("orders", 1001)
        await db.orders.insert_one({
            "id": gen_id(), "number": f"WF-{seq}",
            "client_id": client_doc["id"], "client_name": client_doc["name"],
            "client_phone": client_doc["phone"],
            "pickup_address": client_doc["address"], "pickup_slot": "Today 5pm-7pm",
            "notes": "Ring doorbell twice.",
            "items": items, "subtotal_paise": subtotal, "gst_paise": gst,
            "total_paise": subtotal + gst,
            "status": "assigned",
            "delivery_user_id": driver["id"], "delivery_user_name": driver["name"],
            "pickup_otp_hash": None, "delivery_otp_hash": None,
            "created_at": now_iso(), "updated_at": now_iso(),
            "history": [
                {"status": "pending", "at": now_iso(), "by": client_doc["id"]},
                {"status": "assigned", "at": now_iso(), "by": "seed"},
            ],
            "paid": False,
        })
        seeded["demo_order"] = "created"

    return {"seeded": seeded}


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"app": "WashFlow ERP", "business": BUSINESS["name"], "status": "ok"}


# ---------------------------------------------------------------------------
# Wire it up
# ---------------------------------------------------------------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def _shutdown():
    client.close()
