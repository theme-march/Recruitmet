# Backup and Recovery

Take encrypted daily MySQL full backups plus binlog point-in-time recovery, and apply retention required by the organization. Versioned private document objects must be backed up with matching retention. Quarterly, restore database and objects into an isolated environment, verify row counts/checksums, sign in, open a candidate file, download a document, and run a report.

Before schema deployment, take a verified backup. Recovery order is database, object storage, application release, then health/smoke checks. Never restore production secrets into lower environments. Record recovery time and recovery point evidence in the incident log.
