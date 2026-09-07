# Role-based access control

Super Administrators manage roles at `/permissions`.

1. In **Roles & Permissions**, use **Create role**, enter a name, and select the permitted modules/actions. Save the role.
2. In **Staff & Access**, create a staff account or select **Manage access** on an existing account and assign the role.
3. Test the staff account. Ungranted APIs return 403. Ungranted modules are absent from the sidebar. A user without dashboard access receives a welcome page, not executive data.

Only Super Administrator and Call Center Officer are default staff roles. Existing Agent Partner accounts remain linked to the separate portal. Custom role names containing “admin” do not confer administrative rights.

## Permission contract

- One primary role per user. New roles start with no access.
- View is required before another action can be granted. Removing View clears that module's actions.
- Destination dossier permissions are independent (Dubai, Saudi Arabia, Oman, etc.). “Other” is not a catch-all permission for every destination.
- Dossier View includes the dossier's details and ledger. Payment recording/refunds and agent portal account provisioning have additional checks.
- Dashboard and Management Reports intentionally expose cross-module summaries; grant them only to staff who should see that information.
- The permission editor exposes the project's shared action vocabulary. Some legacy modules do not yet have a UI for every action; an action grant does not create a missing workflow.
- These are module/action permissions, not per-field or per-workflow-stage policies. Office metadata retains the project's existing office-scoping behaviour; this change does not introduce tenant isolation or approval workflows.

## Enforcement and lifecycle

`src/lib/permission-policy.ts` is the shared vocabulary. `authorization.ts` checks the current database role. Every operational API uses `withApiAccess`; unrecognized routes are denied. Server Actions also check permissions. Do not depend on sidebar visibility or the Proxy for authorization.

Role changes take effect on the next request, including existing sessions. The client refreshes its permission display periodically/on focus; stale buttons cannot bypass the server. User deactivation or password reset revokes sessions.

Role saves and their audit events are transactional and use optimistic version checks. The default role cannot be renamed, Super Administrator permissions cannot be modified, and roles assigned to users cannot be deleted. Deactivate staff instead of deleting operational history.

Login no longer runs destructive database synchronization. Seed preserves custom roles, staff and existing permission decisions. No schema migration is needed for this release.

## Verification

Run the TypeScript check, production build, and `tsx --test` over the test files. The opt-in integration test requires `RUN_ACCESS_CONTROL_E2E=1`, a local running app and the seeded administrator (or `ACCESS_TEST_ADMIN` / `ACCESS_TEST_PASSWORD`). It creates uniquely named test roles/users and cleans up only those fixtures. Audit entries intentionally remain as history.

Before deployment, review existing Call Center grants in the editor and exercise the specific workflows each real custom role needs. Do not treat these regression tests as a complete independent security audit.

Validation at implementation: production build and TypeScript passed; 14 focused access-control/integration/navigation/pagination tests passed. The complete legacy suite still has eight pre-existing path/sidebar expectation failures in admin-operations, module-ui and stage-ui tests (27 passed, 8 failed, 1 opt-in test skipped). These were not hidden or weakened to make the report green.
