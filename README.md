# Orbit Call Center & Office Panel

A focused Next.js + MySQL Call Center & Office Panel for Recruitment and Overseas Employment Lead Management. It provides single-role (`Call Center`) lead capturing, follow-up alerts, officer performance, interview scheduling, candidate attendance, and live CSV import/export.

## Run locally

1. Copy `.env.example` to `.env` and replace `AUTH_SECRET`.
2. Start MySQL: `docker compose up -d mysql`
3. Install and generate: `npm install && npm run db:generate`
4. Create/seed the database: `npm run db:push && npm run db:seed`
5. Start: `npm run dev`

## Login credentials

The system operates with a single, streamlined role: **`Call Center`**.

| Role | Starter login | Password | Responsibility |
|---|---|---|---|
| Call Center | `callcenter@orbit.com` | `Admin@123` | Lead intake, calls, priority follow-ups, registration and interview drives |
| Call Center | `sadia@orbit.com` | `Orbit@2026Demo` | Officer lead handling and interview scheduling |

## Core Functional Modules

- **Office Dashboard (`/dashboard`)**: Live KPI metrics for total leads, calls due today, overdue follow-ups, scheduled interviews, converted candidates, and recent work calls list.
- **Create Work Call (`/module/call-center/create-work-call`)**: Comprehensive lead creation with personal details, work categories, interview options, and multi-tier comments.
- **Work Call List (`/module/call-center/work-call-list`)**: Multi-filter search, CSV download, CSV upload/import, file status breakdowns, and expandable lead records.
- **Officer Dashboard (`/module/call-center/officer-dashboard`)**: Top 20 priority call list, category breakdown, urgent alerts for missing passports and upcoming interviews.
- **Registration & Interviews (`/module/call-center/registration-and-interviews`)**: Interview schedules, candidate roster, attendance tracking, and assessment score updating.

# Recruitmet
