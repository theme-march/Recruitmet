# Role and data operating model

## Three-login model

Orbit uses three roles only. Multiple staff accounts may share the Administrator role; their office assignment and audit identity keep their actions separate.

1. **Call Center** creates and follows leads, registers a selected person and manages interviews.
2. **Administrator** reviews the registered candidate, opens one country processing file, assigns an officer and completes passport, medical, payment, approval, visa, manpower and flight stages.
3. **Super Administrator** controls users, role permissions, offices, global settings and audit. This role supervises operations but should not be used for normal daily data entry.

## Data flow

`WorkCall -> Candidate -> ProcessingFile -> Country stage records -> Payment/Document/Flight -> Completed or Returned`

- Work Call List data is entered by Call Center users.
- A candidate is created when an approved lead is converted or registered.
- The Admin Operations dashboard shows candidates that do not yet have an active processing file.
- Opening a file chooses the destination country and loads the configured KSA, Dubai or Other Country workflow.
- Every country menu and report reads the same `ProcessingFile` relation and office scope; no country keeps a disconnected candidate copy.
- Each creation and stage transition writes activity and immutable audit records.

## Daily ownership

| Area | Primary owner | Supervision |
|---|---|---|
| Lead, call, follow-up | Call Center | Admin |
| Candidate registration/interview | Call Center + Admin approval | Admin |
| Country file and assignment | Admin | Super Admin audit |
| Passport through flight | Admin team | Admin manager |
| Users, permissions, offices | Super Admin | Super Admin |
| Audit and incident review | Super Admin | Organization owner |

No fourth dashboard is needed. Add department accounts under the Administrator role and use office scope, assignment and audit logs for accountability.
