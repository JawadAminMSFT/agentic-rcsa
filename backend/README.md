# Intelligent RCSA

## Overview

This repository contains an automated Risk and Control Self-Assessment (RCSA) workflow built on top of the Azure OpenAI service and the Agents SDK. The `agentic_rcsa.py` script orchestrates a multi-step process to:

1. Generate a draft project submission
2. Map risks to categories and sub-risks
3. Map each risk to controls
4. Propose mitigations for each risk-control pair
5. Flag issues and deficiencies
6. Evaluate guardrails and enforce compliance
7. Make a final approval decision

It persistently records context and produces JSON outputs that can be consumed by a frontend UI or other services.

---

## Repository Structure

```
intelligent-rcsa/
│
├── agentic_rcsa.py          # Main orchestration and agents implementation
├── data/                    # Data catalogs and sample submissions
│   ├── risks.json           # Risk catalog definitions
│   ├── controls.json        # Control catalog definitions
│   ├── guardrails.json      # Guardrail rules for compliance checks
│   └── sample_submissions.json  # Historical submissions for few-shot context
│
├── output/                  # Generated workflow contexts with UI updates
│   └── workflow_context_<UUID>.json
│
└── README.md                # This documentation
```

---

## Data Model

All workflow state is stored in a single `WorkflowContext` dataclass. After each step, a snapshot is written to `output/workflow_context_<id>.json`.

```json
{
  "project_description": "...",
  "draft_submission": {"project_title": "...", "objectives": [...], ...},
  "risk_mapping": [{"risk": "...", "category": "...", "confidence": 0.92}, ...],
  "controls_mapping": [{"risk": "...", "controls": [{"control_id": "C002", "relevance_score": 0.85}, ...]}],
  "mitigation_proposals": [{"risk": "...", "control_id": "C002", "mitigation_steps": [...]}, ...],
  "issues_list": [{"issue": "...", "severity": "High", "recommendation": "..."}],
  "guardrail_violations": {"flag_issues": [{"ruleId": "G01", "description": "...", "severity": "Medium"}], ...},
  "decision_result": {"decision": "Approved", "rationale": "..."},
  "ui_updates": [{"step": "generate_draft", "output": {...}}, ...],
  "feedbacks": {"generate_draft": "Updated objectives to include X."}
}
```

### Key Fields

- **project_description** (str): The user-provided description.
- **draft_submission** (dict): Title, description, objectives, benefits, deliverables.
- **risk_mapping** (List[dict]): Identified risks with categories and confidences.
- **controls_mapping** (List[dict]): Controls mapped to each risk.
- **mitigation_proposals** (List[dict]): Mitigation steps for each risk-control pair.
- **issues_list** (List[dict]): QA flagged issues.
- **guardrail_violations** (dict): Rules violated per step.
- **decision_result** (dict): Final approval decision and rationale.
- **ui_updates** (List[dict]): Ordered events for the UI to render step-by-step flows.
- **feedbacks** (dict): User feedback captured per step.

---

## Workflow Execution

The `run_risk_workflow(project_description, context_id=None)` function drives the step-by-step flow:

1. **Generate Draft**: Calls the `draft_agent` to create a project submission stub.
2. **Map Risks**: Uses the `mapping_agent` and risk catalog.
3. **Map Controls**: Uses the `controls_agent` and control catalog.
4. **Generate Mitigations**: Uses the `mitigation_agent`.
5. **Flag Issues**: Uses the `qa_agent` to QA the draft and mitigations.
6. **Guardrail Evaluation**: Runs `guardrail_agent` to enforce rules.
7. **Final Decision**: Uses the `decision_agent` to approve or reject.

After every step, the context is saved and the `ui_updates` list is appended, containing the step name and raw JSON output. The frontend can iterate over `ui_updates` to render each step and its data.

---

## UI Integration Guidelines

- **Loading State**: Read `output/workflow_context_<id>.json` and parse the `ui_updates` array.
- **Rendering Steps**: For each entry in `ui_updates`, display:
  - Step name (e.g., "generate_draft")
  - JSON payload for that step
  - Optional user feedback box if no feedback exists
- **Feedback Loop**: When a user submits feedback in the UI, merge it into the corresponding `ui_updates` entry and POST it back to a small backend endpoint that rewrites the JSON and triggers the next step.
- **Progress UI**: Show a progress bar or wizard with the six workflow stages.
- **Live Updates**: Poll or use WebSocket to notify the frontend when a new context file is updated.

---

## Getting Started

### Prerequisites

- Python 3.8 or higher
- An Azure OpenAI deployment with GPT-4.1
- `.env` file with:
  ```ini
  AZURE_OPENAI_DEPLOYMENT=<your_deployment_name>
  AZURE_OPENAI_API_KEY=<your_api_key>
  AZURE_OPENAI_API_VERSION=<api_version>
  AZURE_OPENAI_ENDPOINT=https://<your_resource>.openai.azure.com/
  ```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run the Workflow

```bash
python agentic_rcsa.py
```

Follow prompts to enter a project description. A context file will be created under `output/` and the console will guide you through feedback loops.

---

## Running the FastAPI Backend

You can also run the backend as a FastAPI server to provide a REST API for workflow orchestration and CRUD operations.

### Start the API Server

Install FastAPI and Uvicorn if you haven't already:

```bash
pip install fastapi uvicorn
```

Then start the server:

```bash
uvicorn api:app --reload
```

This will launch the API at `http://127.0.0.1:8000` by default.

### API Endpoints

- `POST /workflow/start` — Start a new risk workflow (provide `project_description` in the body)
- `GET /workflow/{context_id}` — Get the current workflow state by context ID
- `POST /workflow/{context_id}/feedback` — Submit feedback for a workflow step
- `GET /workflows` — List all workflow context IDs
- CRUD endpoints for:
  - `/controls` (GET, POST, PUT, DELETE)
  - `/risks` (GET, POST, PUT, DELETE)
  - `/samples` (GET, POST, PUT, DELETE)
  - `/guardrails` (GET, POST, PUT, DELETE)

You can use tools like [Swagger UI](http://127.0.0.1:8000/docs) or [Postman](https://www.postman.com/) to interact with the API.

---

## For Backend Engineers

- **Extending Agents**: Add new `@function_tool` wrappers for custom data fetch or evaluation logic.
- **Modifying the Flow**: Update the `steps` list in `run_risk_workflow` or the orchestrator instructions.
- **Updating Data Catalogs**: Edit JSON files under `data/`.
- **Unit Testing**: Wrap agent runs and mock OpenAI responses. Store test contexts in `data/`.

---

## Contributing

1. Fork the repo
2. Create a feature branch
3. Submit a PR with clear descriptions of changes
4. Ensure all new logic is covered by unit tests

---

## License

MIT © Your Organization
