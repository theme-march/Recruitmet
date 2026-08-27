# Workflow Configuration

Country workflows are database configuration, not route code: `Country` → ordered `CountryWorkflowStage` → `StageRequirement` and `WorkflowTransition`. The transition service locks movement to declared next stages, verifies document/payment/approval prerequisites, blocks terminal records, records before/after history, and emits audit/activity/notification rows in one transaction.

KSA and UAE starter workflows are seeded from the supplied requirements. Other countries use the generic configurable template. Hold, return, release, and reprocess are separate authorized commands with mandatory reasons so their history cannot be confused with normal advancement.
