# Deployment

Set `DATABASE_URL`, a random 32+ character `AUTH_SECRET`, and either local private storage or S3-compatible secrets. Run `prisma migrate deploy`, seed only when provisioning a new environment, then start the standalone Next.js server. `docker compose up --build` provides an application and MySQL development stack; change every example credential before shared use.

Terminate TLS at the load balancer, keep MySQL and object storage private, mount durable storage if using the local driver, and check `/api/health` from the platform. Run at least two application instances only when document storage is shared (S3/NAS), and use a scheduler/queue for notification retries and expiry reminders.
