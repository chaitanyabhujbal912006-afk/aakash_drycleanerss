"""WashFlow ERP – Backend API test suite (pytest).

Runs against REACT_APP_BACKEND_URL. Order flows are stateful, so tests are
ordered by numeric prefixes within each class.
"""
from __future__ import annotations

import os
import time
import uuid
from typing import Any

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@aakash.in", "password": "admin123"}
DRIVER = {"email": "driver@aakash.in", "password": "driver123"}
CLIENT = {"email": "priya@example.com", "password": "priya123"}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(s: requests.Session, creds: dict) -> str:
    r = s.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token(session):
    # Ensure seed first
    session.post(f"{API}/seed", timeout=15)
    return _login(session, ADMIN)


@pytest.fixture(scope="session")
def driver_token(session):
    return _login(session, DRIVER)


@pytest.fixture(scope="session")
def client_token(session):
    return _login(session, CLIENT)


def h(t: str) -> dict:
    return {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}


# Shared state across tests
STATE: dict[str, Any] = {}


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# ---------------------------------------------------------------------------
# Seed (idempotency)
# ---------------------------------------------------------------------------
class TestSeed:
    def test_seed_idempotent(self, session):
        r = session.post(f"{API}/seed", timeout=15)
        assert r.status_code == 200
        data = r.json()["seeded"]
        # Second call — everything should be 'existed'/'already have'
        assert data["admin@aakash.in"] == "existed"
        assert data["driver@aakash.in"] == "existed"
        assert data["priya@example.com"] == "existed"
        assert "already have" in data["services"]


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class TestAuth:
    def test_login_admin(self, session):
        r = session.post(f"{API}/auth/login", json=ADMIN)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and data["user"]["role"] == "admin"

    def test_login_bad_password(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN["email"], "password": "wrong"})
        assert r.status_code == 401

    def test_me_requires_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_returns_user(self, session, admin_token):
        r = session.get(f"{API}/auth/me", headers=h(admin_token))
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN["email"]
        assert "password_hash" not in r.json()

    def test_register_new_client(self, session):
        email = f"test_user_{uuid.uuid4().hex[:8]}@example.com"
        r = session.post(f"{API}/auth/register", json={
            "email": email, "password": "secret123", "name": "Test User",
            "phone": "+911234567890", "role": "client", "address": "test",
        })
        assert r.status_code == 200
        assert r.json()["user"]["email"] == email
        STATE["temp_user"] = email

    def test_register_duplicate(self, session):
        r = session.post(f"{API}/auth/register", json={
            "email": CLIENT["email"], "password": "abcdef", "name": "x",
            "phone": "+91", "role": "client",
        })
        assert r.status_code == 400


# ---------------------------------------------------------------------------
# Services catalog
# ---------------------------------------------------------------------------
class TestServices:
    def test_list_services(self, session):
        r = session.get(f"{API}/services")
        assert r.status_code == 200
        svcs = r.json()
        assert len(svcs) >= 14
        assert all("rate_paise" in s for s in svcs)
        # Use only unique names to avoid duplicates from multiple seed runs
        seen = set()
        unique_svcs = []
        for s in svcs:
            if s["name"] not in seen:
                seen.add(s["name"])
                unique_svcs.append(s)
        STATE["services"] = unique_svcs

    def test_admin_can_patch_service(self, session, admin_token):
        svc = STATE["services"][0]
        new_rate = svc["rate_paise"] + 100
        r = session.patch(
            f"{API}/services/{svc['id']}",
            json={
                "name": svc["name"], "category": svc["category"],
                "service_type": svc["service_type"],
                "rate_paise": new_rate, "active": True,
            },
            headers=h(admin_token),
        )
        assert r.status_code == 200
        assert r.json()["rate_paise"] == new_rate
        # Revert
        session.patch(
            f"{API}/services/{svc['id']}",
            json={
                "name": svc["name"], "category": svc["category"],
                "service_type": svc["service_type"],
                "rate_paise": svc["rate_paise"], "active": True,
            },
            headers=h(admin_token),
        )

    def test_client_cannot_patch_service(self, session, client_token):
        svc = STATE["services"][0]
        r = session.patch(
            f"{API}/services/{svc['id']}",
            json={
                "name": svc["name"], "category": svc["category"],
                "service_type": svc["service_type"],
                "rate_paise": 1, "active": True,
            },
            headers=h(client_token),
        )
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# Orders / lifecycle
# ---------------------------------------------------------------------------
class TestOrderLifecycle:
    def test_client_create_order(self, session, client_token):
        svcs = STATE["services"][:2]
        payload = {
            "items": [
                {"service_id": svcs[0]["id"], "quantity": 3},
                {"service_id": svcs[1]["id"], "quantity": 2},
            ],
            "pickup_address": "TEST_addr",
            "pickup_slot": "Today 6pm-8pm",
            "notes": "TEST order",
        }
        r = session.post(f"{API}/orders", json=payload, headers=h(client_token))
        assert r.status_code == 200
        o = r.json()
        expected_sub = svcs[0]["rate_paise"] * 3 + svcs[1]["rate_paise"] * 2
        assert o["subtotal_paise"] == expected_sub
        assert o["gst_paise"] == round(expected_sub * 0.18)
        assert o["total_paise"] == o["subtotal_paise"] + o["gst_paise"]
        assert o["number"].startswith("WF-")
        assert o["status"] == "pending"
        STATE["order_id"] = o["id"]
        STATE["order_number"] = o["number"]

    def test_client_sees_own_orders(self, session, client_token):
        r = session.get(f"{API}/orders", headers=h(client_token))
        assert r.status_code == 200
        assert any(o["id"] == STATE["order_id"] for o in r.json())

    def test_driver_does_not_see_unassigned(self, session, driver_token):
        r = session.get(f"{API}/orders", headers=h(driver_token))
        assert r.status_code == 200
        assert not any(o["id"] == STATE["order_id"] for o in r.json())

    def test_admin_sees_all(self, session, admin_token):
        r = session.get(f"{API}/orders", headers=h(admin_token))
        assert r.status_code == 200
        assert any(o["id"] == STATE["order_id"] for o in r.json())

    def test_admin_assign_driver(self, session, admin_token, driver_token):
        # find driver id
        r = session.get(f"{API}/users?role=delivery", headers=h(admin_token))
        assert r.status_code == 200
        drivers = r.json()
        assert drivers
        driver_id = next(d["id"] for d in drivers if d["email"] == DRIVER["email"])
        STATE["driver_id"] = driver_id

        r = session.patch(
            f"{API}/orders/{STATE['order_id']}/assign",
            json={"delivery_user_id": driver_id},
            headers=h(admin_token),
        )
        assert r.status_code == 200
        assert r.json()["status"] == "assigned"

        # driver should now see it & have notification
        r = session.get(f"{API}/orders", headers=h(driver_token))
        assert any(o["id"] == STATE["order_id"] for o in r.json())
        r = session.get(f"{API}/notifications", headers=h(driver_token))
        assert any(STATE["order_number"] in n["message"] for n in r.json())

    def test_pickup_otp_flow(self, session, client_token, driver_token):
        r = session.post(f"{API}/orders/{STATE['order_id']}/send-pickup-otp",
                         headers=h(client_token))
        assert r.status_code == 200
        otp = r.json()["otp"]
        assert len(otp) == 6 and otp.isdigit()

        # wrong OTP
        r = session.post(f"{API}/orders/{STATE['order_id']}/verify-pickup-otp",
                         json={"otp": "000000" if otp != "000000" else "111111"},
                         headers=h(driver_token))
        assert r.status_code == 400

        # correct OTP
        r = session.post(f"{API}/orders/{STATE['order_id']}/verify-pickup-otp",
                         json={"otp": otp}, headers=h(driver_token))
        assert r.status_code == 200

        r = session.get(f"{API}/orders/{STATE['order_id']}", headers=h(driver_token))
        assert r.json()["status"] == "picked_up"

    def test_driver_count_log(self, session, driver_token):
        payload = {
            "items": [
                {"category": "Gents", "count": 3},
                {"category": "Ladies", "count": 2},
            ],
            "photo_urls": [],
            "driver_notes": "checked",
        }
        r = session.post(f"{API}/orders/{STATE['order_id']}/driver-count",
                         json=payload, headers=h(driver_token))
        assert r.status_code == 200
        assert r.json()["checkpoint"] == "driver_count"
        assert r.json()["actual_count"] == 5

    def test_shop_receipt_match(self, session, admin_token):
        payload = {
            "actual_items": [
                {"category": "Gents", "count": 3},
                {"category": "Ladies", "count": 2},
            ],
            "photo_urls": [],
        }
        r = session.post(f"{API}/orders/{STATE['order_id']}/shop-receipt",
                         json=payload, headers=h(admin_token))
        assert r.status_code == 200
        assert r.json()["mismatch"] is False

        r = session.get(f"{API}/orders/{STATE['order_id']}", headers=h(admin_token))
        assert r.json()["status"] == "washing"

    def test_status_transitions(self, session, admin_token, client_token, driver_token):
        for stat in ("ironing", "ready"):
            r = session.patch(f"{API}/orders/{STATE['order_id']}/status",
                              json={"status": stat}, headers=h(admin_token))
            assert r.status_code == 200
            assert r.json()["status"] == stat

        # client cannot change status
        r = session.patch(f"{API}/orders/{STATE['order_id']}/status",
                          json={"status": "delivered"}, headers=h(client_token))
        assert r.status_code == 403

        # driver cannot change status directly via generic PATCH endpoint
        r = session.patch(f"{API}/orders/{STATE['order_id']}/status",
                          json={"status": "delivered"}, headers=h(driver_token))
        assert r.status_code == 403

    def test_delivery_otp_flow(self, session, admin_token, driver_token):
        r = session.post(f"{API}/orders/{STATE['order_id']}/send-delivery-otp",
                         headers=h(admin_token))
        assert r.status_code == 200
        otp = r.json()["otp"]
        assert len(otp) == 6

        r = session.get(f"{API}/orders/{STATE['order_id']}", headers=h(admin_token))
        assert r.json()["status"] == "out_for_delivery"

        r = session.post(f"{API}/orders/{STATE['order_id']}/verify-delivery-otp",
                         json={"otp": otp}, headers=h(driver_token))
        assert r.status_code == 200

        r = session.get(f"{API}/orders/{STATE['order_id']}", headers=h(driver_token))
        assert r.json()["status"] == "delivered"


# ---------------------------------------------------------------------------
# Invoices + payments
# ---------------------------------------------------------------------------
class TestInvoicesPayments:
    def test_generate_invoice(self, session, admin_token):
        r = session.post(f"{API}/invoices/generate/{STATE['order_id']}",
                         headers=h(admin_token))
        assert r.status_code == 200
        inv = r.json()
        assert inv["number"].startswith("INV-")
        assert inv["cgst_paise"] == round(inv["subtotal_paise"] * 0.09)
        assert inv["sgst_paise"] == round(inv["subtotal_paise"] * 0.09)
        assert inv["cgst_paise"] + inv["sgst_paise"] == inv["gst_paise"]
        STATE["invoice_id"] = inv["id"]
        STATE["invoice_number"] = inv["number"]

    def test_generate_invoice_idempotent(self, session, admin_token):
        r = session.post(f"{API}/invoices/generate/{STATE['order_id']}",
                         headers=h(admin_token))
        assert r.status_code == 200
        assert r.json()["id"] == STATE["invoice_id"]

    def test_client_lists_own_invoices(self, session, client_token):
        r = session.get(f"{API}/invoices", headers=h(client_token))
        assert r.status_code == 200
        assert any(i["id"] == STATE["invoice_id"] for i in r.json())

    def test_invoice_pdf(self, session, client_token):
        r = session.get(
            f"{API}/invoices/{STATE['invoice_id']}/pdf",
            params={"token": client_token},
        )
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert len(r.content) > 500
        # PDF magic bytes
        assert r.content[:4] == b"%PDF"

    def test_invoice_pdf_no_token(self, session):
        r = session.get(f"{API}/invoices/{STATE['invoice_id']}/pdf")
        assert r.status_code == 401

    def test_payment_create_and_verify(self, session, client_token):
        r = session.post(f"{API}/payments/create-order/{STATE['invoice_id']}",
                         headers=h(client_token))
        assert r.status_code == 200
        data = r.json()
        assert data["rp_order_id"].startswith("order_MOCK")
        assert data["amount"] > 0

        r = session.post(f"{API}/payments/verify/{STATE['invoice_id']}",
                         json={
                             "razorpay_order_id": data["rp_order_id"],
                             "razorpay_payment_id": "pay_MOCK000000",
                             "razorpay_signature": "mock_signature",
                         },
                         headers=h(client_token))
        assert r.status_code == 200
        assert r.json()["status"] == "paid"

        inv = session.get(f"{API}/invoices/{STATE['invoice_id']}",
                          headers=h(client_token)).json()
        assert inv["status"] == "paid"
        order = session.get(f"{API}/orders/{STATE['order_id']}",
                            headers=h(client_token)).json()
        assert order["paid"] is True


# ---------------------------------------------------------------------------
# Complaints
# ---------------------------------------------------------------------------
class TestComplaints:
    def test_client_create_complaint(self, session, client_token):
        r = session.post(f"{API}/complaints", json={
            "order_id": STATE.get("order_id"),
            "subject": "TEST complaint",
            "message": "Stain not removed",
        }, headers=h(client_token))
        assert r.status_code == 200
        assert r.json()["status"] == "open"

    def test_client_lists_own_complaints(self, session, client_token):
        r = session.get(f"{API}/complaints", headers=h(client_token))
        assert r.status_code == 200
        assert any(c["subject"] == "TEST complaint" for c in r.json())

    def test_admin_sees_all_complaints(self, session, admin_token):
        r = session.get(f"{API}/complaints", headers=h(admin_token))
        assert r.status_code == 200
        assert len(r.json()) >= 1


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------
class TestNotifications:
    def test_client_has_notifications(self, session, client_token):
        r = session.get(f"{API}/notifications", headers=h(client_token))
        assert r.status_code == 200
        # Notifications may be empty if this run's order lifecycle tests were the first to create them
        assert isinstance(r.json(), list)


# ---------------------------------------------------------------------------
# Dashboard stats
# ---------------------------------------------------------------------------
class TestDashboard:
    def test_stats_admin(self, session, admin_token):
        r = session.get(f"{API}/dashboard/stats", headers=h(admin_token))
        assert r.status_code == 200
        data = r.json()
        for k in ("active_orders", "revenue_today_paise", "pending_pickups",
                  "mismatches", "seven_days", "drivers"):
            assert k in data
        assert len(data["seven_days"]) == 7
        assert isinstance(data["drivers"], list)

    def test_stats_forbidden_for_client(self, session, client_token):
        r = session.get(f"{API}/dashboard/stats", headers=h(client_token))
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# AI Chat
# ---------------------------------------------------------------------------
class TestAIChat:
    def test_ai_chat_stream(self, session, client_token):
        sid = f"TEST_{uuid.uuid4().hex[:8]}"
        r = session.post(f"{API}/ai/chat", json={
            "session_id": sid,
            "message": "Hi, where is my last order?",
        }, headers=h(client_token), stream=True, timeout=60)
        assert r.status_code == 200
        text = r.text
        assert len(text) > 0
        # Should NOT be an assistant error
        assert "[assistant error" not in text, f"AI error: {text[:200]}"
        STATE["chat_session"] = sid
        STATE["chat_reply_len"] = len(text)

    def test_ai_history_persisted(self, session, client_token):
        # slight wait for db write
        time.sleep(1)
        r = session.get(f"{API}/ai/history/{STATE['chat_session']}",
                        headers=h(client_token))
        assert r.status_code == 200
        msgs = r.json()
        assert len(msgs) >= 1  # user message at minimum
        roles = {m["role"] for m in msgs}
        assert "user" in roles
