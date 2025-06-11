# Intelligent RCSA Accelerator

## Overview

The Intelligent RCSA (Risk and Control Self-Assessment) Accelerator is an end-to-end solution for automating risk workflows using Azure OpenAI and a modular agentic architecture. It enables organizations to:

- Generate draft project submissions
- Map risks to categories and sub-risks
- Map risks to controls
- Propose mitigations for each risk-control pair
- Flag issues and deficiencies
- Evaluate guardrails and enforce compliance
- Make final approval decisions
- Capture and process user feedback asynchronously

The accelerator provides a FastAPI backend, a modern React/Next.js frontend, and a flexible agent-based orchestration layer for extensibility and compliance.

---

## Architecture & Components

### Backend (Python/FastAPI)
- **agentic_rcsa.py**: Core orchestration logic, agent definitions, and workflow context management.
- **api.py**: FastAPI server exposing REST endpoints for workflow orchestration, feedback, and CRUD operations.
- **data/**: JSON catalogs for risks, controls, guardrails, and past submissions.
- **output/**: Stores workflow context files (one per workflow instance).

### Frontend (React/Next.js)
- **app/**: Next.js app directory structure for workflows, dashboards, and catalogs.
- **components/**: UI components for workflow steps, progress, forms, and catalog views.
- **lib/**: TypeScript utilities for API calls, workflow actions, and data formatting.

### Agents
The accelerator uses modular agents, each responsible for a specific workflow step:

- **Draft Agent**: Generates a draft submission from a project description.
- **Mapping Agent**: Identifies and categorizes risks.
- **Controls Agent**: Maps risks to relevant controls.
- **Mitigation Agent**: Proposes mitigations for each risk-control pair.
- **QA Agent**: Flags issues and deficiencies in the draft and mitigations.
- **Decision Agent**: Makes approval/rejection decisions based on controls and issues.
- **Guardrail Agent**: Evaluates compliance with guardrail rules.
- **Feedback Agent**: Processes user feedback asynchronously and updates the workflow context.

All agents are orchestrated via the `run_risk_workflow` function and can be extended or customized for new logic.

---

## Data Model

All workflow state is stored in a single `WorkflowContext` dataclass and persisted as JSON. Key fields include:

- `project_description`: User-provided description
- `draft_submission`: Draft details (title, objectives, etc.)
- `risk_mapping`: Identified risks
- `controls_mapping`: Controls mapped to risks
- `mitigation_proposals`: Mitigation steps
- `issues_list`: QA flagged issues
- `guardrail_violations`: Guardrail rule violations
- `decision_result`: Final approval decision
- `ui_updates`: Ordered events for UI rendering
- `feedbacks`: User feedback per step

---

## How to Deploy

### Prerequisites
- Python 3.8+
- Node.js 18+
- Azure OpenAI deployment (GPT-4.1)
- `.env` file in `backend/` with Azure OpenAI credentials:
  ```ini
  AZURE_OPENAI_DEPLOYMENT=<your_deployment_name>
  AZURE_OPENAI_API_KEY=<your_api_key>
  AZURE_OPENAI_API_VERSION=<api_version>
  AZURE_OPENAI_ENDPOINT=https://<your_resource>.openai.azure.com/
  ```

### Backend Setup
1. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. Start the FastAPI server:
   ```bash
   uvicorn api:app --reload
   ```
   The API will be available at `http://127.0.0.1:8000`.

### Frontend Setup
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   # or
   pnpm install
   ```
2. Set the backend API URL in your environment (if not default):
   ```bash
   export NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```
   The frontend will be available at `http://localhost:3000`.

---

## Usage

- Start a new workflow from the UI or via `POST /workflow/start`.
- Progress through each workflow step, providing feedback as needed.
- The backend processes feedback asynchronously; the frontend polls for updates.
- All workflow state is persisted in `backend/output/` as JSON for traceability.

---

## Extending the Accelerator

- **Add new agents**: Implement new @function_tool wrappers in `agentic_rcsa.py`.
- **Modify workflow steps**: Update the `steps` list in `run_risk_workflow` or orchestrator instructions.
- **Update catalogs**: Edit JSON files in `backend/data/`.
- **Customize UI**: Extend React components in `frontend/components/`.

---

## License

MIT © Microsoft
