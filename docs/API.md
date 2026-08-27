# API Contract

All protected endpoints require the signed `orbit_session` HTTP-only cookie. Successful single-resource responses use `{ "data": ... }`; lists use `{ "data": [], "meta": { "page", "pageSize", "total", "totalPages" }`. Errors use `{ "error": { "code", "message", "fieldErrors", "correlationId" } }`.

Core resources: `/api/leads`, `/api/candidates`, `/api/interviews`, `/api/files`, `/api/payments`, `/api/documents`, `/api/flights`, `/api/notifications`, `/api/master-data/:type`, `/api/admin/users`, and `/api/admin/roles`. Workflow actions are explicit nested routes: follow-up, convert, assessment, transition, hold, return, release, reprocess, refund, document verification, and mark-flown. Candidate CSV import is preview-then-commit. Reports support JSON plus `?format=csv` or `?format=pdf`.

List endpoints accept `page`, `pageSize` (10–100), `q`, and resource-specific filters. Mutations validate JSON or multipart input with Zod and enforce server-side RBAC and office scope.
