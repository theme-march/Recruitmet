# Recruitment & Overseas OS Architecture

## Source of truth

The 45-page `Recruitment and Overseas-v2.pdf` controls module order, screen names, operational fields, statuses, actions and acceptance. `docs/REQUIREMENT-COVERAGE.md` is the traceability index and must be updated with each completed phase.

## Stack decision

- Next.js 16 App Router, React 19 and TypeScript
- Prisma ORM with MySQL 8 (`recruitment_os`)
- Zod at every external input boundary
- Signed HTTP-only session cookie backed by revocable database sessions
- Local private storage adapter in development; S3-compatible adapter contract in production
- Node built-in test runner for pure domain/unit tests; API integration tests against a disposable database URL

MySQL is intentionally retained instead of the prompt's default PostgreSQL because the original project requirement explicitly selected MySQL and a live database already exists. Domain/service contracts remain database-agnostic.

## Boundaries

```text
UI (app, components)
  -> REST route handlers (authentication, validation, response mapping)
    -> domain services (authorization, business rules, transactions, audit)
      -> repositories / Prisma DAL (scope, pagination, persistence)
        -> MySQL
```

Route handlers must not contain country workflow rules, payment invariants or storage implementation details. Client components receive DTOs, never raw user/session/document entities.

## Domain modules

- `features/auth`: login, recovery, password policy, sessions, devices and login history
- `features/access`: roles, module/page/action permissions and office/ownership data scope
- `features/partners`: offices, officers, agents, vendors, companies, works and demands
- `features/leads`: work calls, phones, comments, calls, follow-ups, priority and conversion
- `features/interviews`: schedules, capacity, assignments, assessment and immutable history
- `features/candidates`: unique person/candidate identity and multi-country files
- `features/workflow`: configured country stages, requirements, transitions and status history
- `features/documents`: private objects, document metadata, versions and verification history
- `features/finance`: invoices, payment items, receipts, refunds and commissions
- `features/flights`: readiness, schedules, passengers, cancellation and completion
- `features/exceptions`: hold, return, release, re-process and closure
- `features/notifications`: in-app delivery plus pluggable email/SMS/WhatsApp channels
- `features/reports`: permission-aware aggregates, CSV/PDF and print DTOs
- `features/common`: search, filters, imports, exports, activity and audit

## Invariants

1. Candidate phone, passport, national ID and configured identifiers are duplicate keys.
2. Candidate and processing file numbers are stable and unique.
3. Workflow transition is one database transaction: lock/read, authorize, validate, update, status history, activity, audit, notifications.
4. Money is decimal, never floating point. Corrections use reversal/refund rows; payment rows are not deleted.
5. Stored objects are private. Download resolves through an authorized streaming endpoint.
6. Terminal files are read-only except through approved re-process.
7. Referenced master data is deactivated rather than deleted.
8. All list APIs are scoped, filtered, sorted and paginated server-side.

## Error contract

```json
{"error":{"code":"WORKFLOW_PREREQUISITE_FAILED","message":"Verified passport is required.","fieldErrors":{},"correlationId":"..."}}
```

Stack traces, SQL and storage paths are never returned to clients.
