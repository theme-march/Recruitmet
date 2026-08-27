# Assumptions and Decisions

1. MySQL 8 is retained because it was explicitly requested before the attached engineering brief and is already the live development database.
2. Currency defaults to BDT but every financial row stores its currency.
3. Local filesystem storage is development-only. Production must configure the S3 adapter; database rows store opaque object keys, not public URLs.
4. Email/SMS/WhatsApp delivery uses adapters. In-app delivery works without external credentials; unavailable channels remain queued/failed with a recorded reason.
5. Existing demo rows are development seed data and are never generated in production.
6. Soft-deactivation is the default for referenced master data. Physical deletion requires an unreferenced record and explicit permission.
