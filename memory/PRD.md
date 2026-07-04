# WashFlow ERP — Aakash Drycleaners

## Original Problem Statement
Enterprise-grade laundry ERP for "Aakash Drycleaners" (WashFlow). Three roles (Admin web, Delivery mobile-web, Client mobile-web), full order lifecycle with OTP verification at pickup + delivery, GST-compliant invoicing, Razorpay payments (mocked), Claude-powered AI concierge.

## Delivered Architecture (v1)
- **Backend**: FastAPI + Motor (MongoDB), JWT auth, bcrypt hashing, ReportLab PDF.
- **Frontend**: React 19 + Tailwind + shadcn/ui + Recharts + cmdk.
- **AI**: Claude Sonnet 4.6 via `emergentintegrations` (streaming) using `EMERGENT_LLM_KEY`.
- **Design**: Brand `#0C5E48`, background `#F4F3EF`, Geist + Cabinet Grotesk + Plus Jakarta Sans fonts, glowing status-dot badges, 220px fixed admin sidebar.
- **Payments/SMS/Push**: MOCKED (OTPs returned in JSON, Razorpay auto-verify).

## Personas
1. **Admin (Aakash Owner)** — dispatches, resolves discrepancies, tracks revenue.
2. **Delivery Agent (Ravi)** — picks up / delivers with OTP + count entry.
3. **Client (Priya)** — places orders, verifies pickup, pays invoices, chats with concierge.

## What's implemented (Jul 2026 v1)
- JWT auth (register / login / me) + seed endpoint (idempotent).
- Full order lifecycle across 10 statuses with in-DB history log.
- 4 verification checkpoints (driver_count, pickup_otp, shop_receipt, delivery_otp).
- Services catalog CRUD, per-service pricing in paise, 18% GST auto-computed.
- Invoice generation → branded PDF (ReportLab) with CGST/SGST split, PAID/PENDING badge.
- Complaints, notifications, dashboard stats (KPIs + 7-day revenue + driver leaderboard).
- Claude AI chat (streaming) — client concierge with order context + admin ops copilot in Cmd+K.
- Admin dashboard: KPIs, Recharts bar chart, orders table w/ slide-over detail, assign-driver, advance-status, generate-invoice, shop-receipt.
- Client mobile-web: hero home, place order, live tracking timeline, OTP verify hero, invoice PDF + mock pay.
- Delivery mobile-web: grouped Pickups/Deliveries, large-touch count entry, AI-estimate button, OTP entry.

## P1 backlog (future work)
- Real Razorpay integration (checkout + webhook HMAC verification).
- Real SMS OTP (Twilio/MSG91).
- Push notifications (Expo/FCM).
- Camera capture + upload for pickup/shop-receipt photos (object storage).
- Live delivery map with driver GPS.
- Role restrictions on `PATCH /orders/:id/status` (currently allows delivery too — testing agent flagged).
- OTP expiry / TTL.
- Frontend 401 redirect on token expiry.

## P2 backlog
- Multi-tenant support (branch / franchise separation).
- SLA tracking + escalation rules.
- Customer-facing loyalty / referral system.
- WhatsApp Business API updates.

## Credentials
`/app/memory/test_credentials.md` — admin/driver/client demo accounts.
