# Orbit Overseas — Recruitment OS & Lead Management System

Orbit Overseas Recruitment OS is a full-featured, enterprise-grade Next.js + MySQL web application designed for recruitment agencies, overseas employment consultants, manpower providers, and office operations teams. It streamlines candidate acquisition, multi-tier lead tracking, visa pipeline processing, interview drives, document verification, payment collections, and country-specific workflows.

---

## 🚀 Key Features

- **Executive & Office Operations Dashboards**: Real-time KPI counters, priority follow-ups, urgent missing-passport alerts, and activity timelines.
- **Candidate & Lead Management**: Comprehensive intake with phone validation, passport tracking, work categories, profession catalogs, and multi-tier notes.
- **Country Pipeline Workflows**: Pre-configured and customizable stages for Saudi Arabia, Dubai/UAE, and other destination countries.
- **Registration & Interview Drives**: Schedule management, candidate rosters, attendance logs, and assessment scoring.
- **Document Management**: Secure document uploads with binary magic byte validation, private storage, and role-based verification.
- **Finance & Payment Collections**: Multi-stage payment recording, money receipt generation with printable PDF view, and refund handling.
- **Demand & Vacancy Tracking**: Corporate demand orders, job vacancy assignments, and quota allocations.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions by module and action (`View`, `Add`, `Edit`, `Delete`, `Export`, `Assign`, `Print`, `Import`).
- **Audit Logging & Security**: Session tracking, cryptographic token hashing, brute-force protection, Cloudflare Turnstile integration, and OWASP-compliant access boundaries.

---

## 💻 System Requirements

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Database**: MySQL `8.0+` or MariaDB `10.5+`
- **Package Manager**: `npm` (v10+), `pnpm` (v9+), or `yarn`
- **Docker** (Optional, for running MySQL in a container): Docker Desktop or Docker Engine

---

## 🛠️ Installation & Setup

### 1. Extract & Navigate
Extract the package zip file and navigate into the root directory:
```bash
cd orbit-recruitment-os
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and configure your database connection and a secure 32+ character authentication secret:
```env
DATABASE_URL="mysql://root:root@localhost:3306/recruitment_os"
AUTH_SECRET="your-at-least-32-characters-secure-random-secret-here"
NEXT_PUBLIC_APP_NAME="Orbit Overseas"
STORAGE_DRIVER="local"
STORAGE_LOCAL_ROOT="storage/private"
```

### 3. Start Database (Docker or Native MySQL)
If you are using Docker:
```bash
docker compose up -d mysql
```
Or start your existing local MySQL service and ensure the database named `recruitment_os` exists.

### 4. Install Dependencies
```bash
npm install
```

### 5. Generate Prisma Client & Run Migrations
```bash
npm run db:generate
npm run db:push
```

### 6. Seed Demo Data
Populate default roles, permissions, master catalogs, and demo accounts:
```bash
npm run db:seed
```

### 7. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Login Credentials

The seed script creates the following starter accounts for evaluation:

| Role | Username / Email | Password | Access Scope |
|---|---|---|---|
| **Super Administrator** | `admin@orbit.com` | `Admin@123` | Full system control, role permissions, master data, audits, and user management |
| **Office Operations Officer** | `callcenter@orbit.com` | `Admin@123` | Candidate intake, calls, follow-ups, interview schedules |
| **Office Operations Staff** | `sadia@orbit.com` | `Orbit@2026Demo` | Officer workstation, lead conversion, candidate registration |

---

## 🧪 Testing & Code Quality

Run the automated test suite:
```bash
npm test
```

Perform strict TypeScript compile validation:
```bash
npm run typecheck
```

Build for production:
```bash
npm run build
```

Start the production server:
```bash
npm run start
```

---

## ⚙️ Environment Variables Reference

| Variable | Required | Default | Description |
|---|:---:|---|---|
| `DATABASE_URL` | Yes | — | MySQL connection string (`mysql://user:pass@host:3306/dbname`) |
| `AUTH_SECRET` | Yes | — | Secret string (min 32 characters) for JWT session signing |
| `NEXT_PUBLIC_APP_NAME` | No | `Orbit Overseas` | Application title displayed across headers and metadata |
| `STORAGE_DRIVER` | No | `local` | Storage driver (`local` or `s3`) |
| `STORAGE_LOCAL_ROOT` | No | `storage/private` | Directory for private document storage |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | No | `""` | Optional Cloudflare Turnstile public key for login captcha |
| `TURNSTILE_SECRET_KEY` | No | `""` | Optional Cloudflare Turnstile secret key |

---

## 📦 Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, Lucide React, Sonner Toast
- **Backend & APIs**: Next.js Server Components, Server Actions & Edge/Node Route Handlers
- **Database & ORM**: MySQL with Prisma ORM 6.19
- **Validation**: Zod 4.5
- **Security**: Jose (JWT), BcryptJS, Private Storage Driver, Input Sanitization
- **Reports**: PDF-Lib, CSV Exporter

---

## 📄 License & Support

Commercial License — Envato Market / CodeCanyon.  
For questions, support, or customization inquiries, please contact through the CodeCanyon item support tab.
