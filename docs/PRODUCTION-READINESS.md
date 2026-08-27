# Production Readiness

Implemented: MySQL migrations/seed, database sessions, password recovery/change, failure throttling, granular RBAC, office scope, configurable workflows, transactional audit/history, duplicate prevention, imports, private versioned files, payments/refunds, flights, exceptions, reports, notifications, server pagination, global search, responsive UI, health check, Docker, tests, and deployment documentation.

Environment integrations still require deployment ownership: SMTP/SMS credentials, production CAPTCHA verification, S3 or durable shared storage, malware scanner, scheduled job runner, TLS/domain, monitoring/alerting, backup destination, and organization-approved retention/legal text. The adapters fail visibly rather than pretending delivery. Complete the security checklist and acceptance test with business owners before handling real passport or payment data.
