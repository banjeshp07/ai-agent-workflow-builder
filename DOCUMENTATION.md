# AI Agent Workflow Builder — Technical Documentation

## 1. Data Model & Schema Design
The PostgreSQL schema enforces multi-tenant boundary control:
* `organizations`: Stores quota bounds and org-level metrics.
* `org_members`: Links users with RBAC roles (`owner`, `editor`, `viewer`).
* `workflows` & `workflow_steps`: Workflow definitions and sequential node configurations (`llm_call`, `http_request`, `conditional_branch`, `approval_gate`).
* `workflow_runs` & `step_runs`: Execution logs tracking live status states (`RUNNING`, `PAUSED`, `COMPLETED`, `APPROVED`).

## 2. Dual-Layer Permissions Enforcement
* **Layer 1 (Row-Level Security):** Hasura table permissions check `org_members` to ensure users can only query/mutate workflows belonging to their own `org_id`.
* **Layer 2 (Step-Level Action Gating):** Mid-execution actions (`approveStep`) verify the approver's role inside the Next.js API handler to prevent unauthorized step resumption even if IDs are guessed.

## 3. Approval Gate & Real-time Execution
* Upon reaching an `approval_gate` step, `triggerWorkflowRun` halts execution, setting `step_runs` to `PENDING` and `workflow_runs` to `PAUSED`.
* Subscriptions update the UI in real time.
* Invoking `approveStep` verifies approver credentials, updates the gate state to `APPROVED`, and resumes workflow completion.