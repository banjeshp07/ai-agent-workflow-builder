# AI Agent Workflow Builder

A mini n8n purpose-built for chaining AI agent steps, featuring multi-step workflow execution, approval gates, organization quotas, and robust permission gating. Built using Next.js, Hasura GraphQL, PostgreSQL, and Gemini API.

---

## 🚀 Features & Architecture

* **Multi-Step Workflow Engine:** Chain various node types including `llm_call` (powered by Google Gemini), `http_request`, and `approval_gate`.
* **Approval Gates & Pause/Resume:** Workflows automatically pause upon encountering an approval gate (`PAUSED` state) and wait for authorized intervention before resuming execution.
* **Quota & Rate Limiting Enforcement:** Automatically checks organization usage limits (`quota_used` vs `quota_allowed`) before triggering workflow runs.
* **Live Dashboard UI:** Clean Next.js dashboard to monitor workflow run statuses (`QUEUED`, `PAUSED`, `COMPLETED`, `FAILED`) in real-time with direct Approve/Reject control actions.

---

## 🛠️ Tech Stack

* **Frontend / API:** Next.js (App Router), React, Tailwind CSS
* **Database & Backend Engine:** PostgreSQL, Hasura GraphQL Engine
* **AI Integration:** Google Gemini API (`gemini-1.5-flash`)

---

## ⚙️ Environment Variables

Create a `.env.local` file in the root directory with the following configuration:

```env
NEXT_PUBLIC_HASURA_GRAPHQL_URL=[https://your-hasura-endpoint.hasura.app/v1/graphql](https://your-hasura-endpoint.hasura.app/v1/graphql)
NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET=your_admin_secret
HASURA_ADMIN_SECRET=your_admin_secret
GEMINI_API_KEY=your_google_gemini_api_key