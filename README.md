# Washflow ERP — Aakash Drycleaners

> A full-stack dry-cleaning management system with role-based portals for **Admin**, **Client**, and **Delivery** personnel.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python · FastAPI · MongoDB (Motor) · PyJWT |
| Frontend | React 18 · React Router · Tailwind CSS · shadcn/ui · Recharts |
| PDF | ReportLab |
| Payments | Razorpay (mock-ready) |
| AI Chat | Emergent LLM (streaming) |

---

## Project Structure

```
aakash_drycleanerss/
├── backend/
│   ├── server.py          # FastAPI app — all routes
│   ├── pdf_gen.py         # Invoice PDF generation
│   ├── .env               # Environment secrets (never commit)
│   ├── requirements.txt
│   ├── Procfile           # Heroku-ready
│   └── tests/
│       └── backend_test.py  # 33 passing tests
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── admin/     # Dashboard, Orders, Delivery, Map, Customers, Invoices, Reports, Settings, Complaints
    │   │   ├── client/    # Home, PlaceOrder, Track, Verify, Invoices, Chat, Complaints
    │   │   └── delivery/  # Tasks, PickupEntry, DeliveryConfirm
    │   ├── layouts/       # AdminLayout, MobileLayout
    │   ├── components/    # StatusBadge, Logo, UI primitives
    │   ├── context/       # AuthContext
    │   └── lib/           # axios api.js, utils
    └── package.json
```

---

## Local Setup

### Prerequisites
- Python 3.10+
- Node 18+
- MongoDB running locally on port `27017`

### 1. Backend

```bash
cd backend
pip install -r requirements.txt

# Copy and fill environment variables
cp .env.example .env

# Start dev server
uvicorn server:app --reload --port 8000
```

The first `POST /api/seed` call will create demo users + services automatically. It is idempotent.

### 2. Frontend

```bash
cd frontend
npm install

# Create .env.local
echo "REACT_APP_BACKEND_URL=http://localhost:8000" > .env.local

npm start
```

The app runs on `http://localhost:3000`.

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@aakash.in` | `admin123` |
| Delivery Driver | `driver@aakash.in` | `driver123` |
| Client | `priya@example.com` | `priya123` |

> Run `POST http://localhost:8000/api/seed` once to create these accounts.

---

## Environment Variables

### Backend (`.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGO_URL` | ✅ | MongoDB connection string |
| `DB_NAME` | ✅ | Database name (default: `washflow`) |
| `JWT_SECRET` | ✅ | Secret key for JWT signing — **change in production** |
| `JWT_EXPIRES_MINUTES` | ✅ | Token expiry in minutes (default: 1440 = 24h) |
| `EMERGENT_LLM_KEY` | ⚠️ | AI Chat API key (leave blank to disable AI) |
| `RAZORPAY_KEY_ID` | ⚠️ | Razorpay key (mock used if absent) |
| `RAZORPAY_KEY_SECRET` | ⚠️ | Razorpay secret |
| `BUSINESS_NAME` | optional | Shown on invoices |
| `BUSINESS_ADDRESS` | optional | Shown on invoices |
| `BUSINESS_GSTIN` | optional | Shown on invoices |
| `BUSINESS_PHONE` | optional | Shown on invoices |
| `BUSINESS_EMAIL` | optional | Shown on invoices |

### Frontend (`.env.local`)

| Variable | Required | Description |
|---|---|---|
| `REACT_APP_BACKEND_URL` | ✅ | Full backend URL e.g. `http://localhost:8000` |

---

## Running Tests

```bash
cd backend
# Make sure backend is running and REACT_APP_BACKEND_URL is set
set REACT_APP_BACKEND_URL=http://localhost:8000
pytest tests/backend_test.py -v
```

**Current status: 33/33 tests passing** (AI Chat tests skipped without `emergentintegrations` key).

---

## Order Lifecycle

```
pending → assigned → picked_up → washing → ironing → ready → out_for_delivery → delivered
```

Each transition is protected:
- `picked_up` — via **Pickup OTP** (client generates → driver enters)
- `out_for_delivery` — via **Delivery OTP** (admin generates → driver enters)
- All other transitions — **admin only**
- Drivers **cannot** call the generic `/status` endpoint (403)

---

## Key Features

- 🔐 **JWT-based RBAC** — admin / client / delivery roles
- 📦 **Full order lifecycle** with OTP verification at pickup & delivery
- 🧮 **Driver count checkpoint** — garment count logged & photo-ready
- 📄 **PDF invoice** with CGST + SGST breakdown
- 💳 **Razorpay payment** integration (mock-safe)
- 💬 **AI Chat** (streaming) for client support
- 📊 **Admin dashboard** with 7-day revenue chart
- 🗺️ **Delivery map** view with driver workload
- 🔔 **Notifications** for order status changes

---

## Deployment

The backend includes a `Procfile` for Heroku-compatible platforms:

```
web: uvicorn server:app --host 0.0.0.0 --port $PORT
```

Set all environment variables in your platform's dashboard.

---

## License

Internal project — Aakash Drycleaners, Bengaluru.
