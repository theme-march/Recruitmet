# Phase 0 Gap Audit

| Area | Before this implementation cycle | Required remediation |
|---|---|---|
| Navigation | All 18 groups and items listed | Keep hierarchy authoritative |
| Database | 20 coarse models, no migration history | Normalize domain entities and create baseline migration |
| Authentication | Login/session/logout only | Recovery, change password, attempt throttling, device/login history |
| Authorization | Admin bypass and partial checks | Seed roles/permissions; enforce page/action and ownership everywhere |
| APIs | Generic `/api/records` | Dedicated predictable REST resources with pagination and DTOs |
| Workflows | Country arrays in route/UI | Database-configured stages/requirements/transitions and domain service |
| Documents | Metadata only | Private local/S3 storage, upload validation, version/download authorization |
| Finance | Basic payment row | Invoice allocation, idempotency, verification, receipt, refund and commission |
| CSV | Export files only | Templates, upload/preview/validate/batched import/error report/history |
| Reports | Dashboard and queue export | Named PDF reports, filters, grouped totals and permission-aware drill-down |
| Notifications | Database row only | Service/channel abstraction, schedules, retry/read/history |
| Tests | None | Unit, API integration and critical lifecycle E2E |
| Operations | Docker MySQL only | App container, health/readiness, backup/recovery and production checklist |

No module is marked complete in the coverage matrix until its database, API, validation, authorization, rules, UI and tests are all present.
