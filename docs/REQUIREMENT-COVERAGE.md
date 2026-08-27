# PDF Requirement Coverage

This implementation follows the 18-section Recruitment and Overseas Employment Management baseline.

| PDF section | Application coverage |
|---|---|
| 01 Authentication | Database credential verification, signed session cookie, database session, logout, locked/inactive enforcement, login audit |
| 02 Admin / Management | Users, roles, module/page/action permission schema, offices, officers and configurable system master records |
| 03 Call Center | Work call/lead creation, assignment, source, purpose, priority, follow-up and converted candidate relationship |
| 04 Registration & Interview | Duplicate-constrained candidates, registration identity, passport/NID, interview scheduling/results |
| 05 Candidate / File | Central candidate and multi-country file, assignment, details, stage, terminal states and timeline |
| 06 Saudi Arabia | Controlled KSA passport-to-flight stage sequence including medical, police, MOFA, Takamul and biometrics |
| 07 Dubai | Controlled UAE approval, confirmation, visa, payment, manpower and flight sequence |
| 08 Other Country | Configurable generic country processing sequence and master-data configuration |
| 09 Office & Vendor | Office relational model and typed master records for vendors, agents, companies, works and demands |
| 10 Payment & Accounts | First/second collection, method/reference, due/partial/paid/refund states and immutable financial records |
| 11 Document Management | Typed versioned documents, verification/rejection/expiry states and file/candidate linkage |
| 12 Flight Management | Schedule, airline, PNR, airport, destination, passengers and completion states |
| 13 Hold & Return | Mandatory reason/comment, previous stage, financial impact, release/re-process history |
| 14 Reports & Analytics | Live dashboard aggregates, country pipeline, filtered operational queues, CSV and print output |
| 15 Notifications | Recipient/type/priority/channel/schedule/read states and linked operational reminders |
| 16 Tutorials | Tutorial categories/resources stored as typed, configurable master records |
| 17 Master Data | Country, status, profession, category, reason and reference types with unique codes and configuration JSON |
| 18 Common Service | Global search API, client filtering, pagination UI, CSV export, print, activity and immutable audit logs |

## Enforced cross-module rules

- Candidate identifiers, passport numbers, NIDs and file numbers are unique.
- Country files advance only one configured stage at a time.
- Visa/readiness transitions check verified documents and paid transactions.
- Completed, returned and expired files reject ordinary transition updates.
- Mutations require a valid database-backed session and server-side permission.
- Non-administrator data access can be restricted to the user's office.
- Financial records use refund/reversal states rather than physical deletion.
- Material create, login and workflow changes create activity/audit records.
