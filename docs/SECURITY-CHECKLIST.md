# Security Checklist

- Replace demo passwords and `AUTH_SECRET`; require HTTPS and secure cookies.
- Grant MySQL least privilege; restrict network ingress and rotate credentials.
- Configure S3 private bucket encryption, versioning, lifecycle, and blocked public access.
- Review RBAC and office scope; disable departed users and revoke their sessions.
- Connect CAPTCHA and mail/SMS providers; keep reset-token responses non-enumerating.
- Scan dependencies/images, patch monthly, and run tests/build before release.
- Forward append-only audit/login events to protected centralized logging.
- Define retention and deletion policy for identity, passport, medical, and financial data.
- Add malware scanning for uploaded documents before regulated production use.
- Test backups, incident response, rate limits, and disaster recovery quarterly.
