# RBAC Matrix

Permissions are stored as `module/page/action` records and attached to roles through `RolePermission`. Actions are View, Add, Update, Delete, Approve, Export, Import, Print, Assign, Verify, Refund, and Reprocess. The System Administrator has an explicit server-side bypass. Other roles receive only their seeded module set; Auditor is read/export/print only.

Every API performs authentication and permission checks. Office-bound users receive an `officeId` predicate on candidate/file/user queries. UI visibility is convenience only and is never treated as authorization. Production administrators should review the seeded matrix in the Roles API before onboarding users.
