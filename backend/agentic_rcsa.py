import asyncio
import json
import os
import uuid
from dataclasses import dataclass, field
from typing import Any, List, Dict
from typing_extensions import Any as AnyType
from openai import AsyncAzureOpenAI
from openai.types.chat import ChatCompletionMessageParam
from agents import (
    Agent,
    FunctionTool,
    RunContextWrapper,
    function_tool,
    ItemHelpers,
    MessageOutputItem,
    Runner,
    trace,
    set_default_openai_client,
    set_tracing_disabled,
    OpenAIChatCompletionsModel,
)
from dotenv import load_dotenv

load_dotenv()
azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT")
# Disable tracing since we're using Azure OpenAI
set_tracing_disabled(disabled=True)

# Initialize OpenAI client
openai_client = AsyncAzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)

# Set the default OpenAI client for the Agents SDK
set_default_openai_client(openai_client)

# --- Context Management Setup ---
@dataclass
class WorkflowContext:
    project_description: str
    # Submission draft data
    draft_submission: Dict[str, Any] = field(default_factory=dict)
    # Mapping of risks to categories/subrisks
    risk_mapping: List[Dict[str, Any]] = field(default_factory=list)
    # Controls mapped to each risk
    controls_mapping: List[Dict[str, Any]] = field(default_factory=list)
    # Proposed mitigation steps
    mitigation_proposals: List[Dict[str, Any]] = field(default_factory=list)
    # Flagged issues and deficiencies
    issues_list: List[Dict[str, Any]] = field(default_factory=list)
    # Final approval decision
    decision_result: Dict[str, Any] = field(default_factory=dict)
    # Guardrail violations per step
    guardrail_violations: Dict[str, List[Dict[str, Any]]] = field(default_factory=dict)
    # Ordered UI updates (step, output)
    ui_updates: List[Dict[str, Any]] = field(default_factory=list)
    # New: Store feedback per step/label
    feedbacks: Dict[str, Any] = field(default_factory=dict)
    # New: Track workflow status and current step
    status: str = "in_progress"  # in_progress, awaiting_feedback, completed
    current_step: str = ""

    def record_step(self, step: str, output: Any, feedback: Any = None):
        if step == "generate_draft":
            self.draft_submission = output
        elif step == "map_risks":
            self.risk_mapping = output
        elif step == "map_controls":
            self.controls_mapping = output
        elif step == "generate_mitigations":
            self.mitigation_proposals = output
        elif step == "flag_issues":
            self.issues_list = output
        elif step == "evaluate_decision":
            self.decision_result = output
        self.ui_updates.append({"step": step, "output": output})
        self.current_step = step
        if feedback is not None:
            self.feedbacks[step] = feedback
        # If feedback is required, set status to awaiting_feedback
        if feedback == "__AWAIT_FEEDBACK__":
            self.status = "awaiting_feedback"
        else:
            self.status = "in_progress"

    def record_guardrail(self, step: str, violations: List[Dict[str, Any]]):
        self.guardrail_violations[step] = violations
        self.ui_updates.append({"step": f"guard_{step}", "output": violations})

    def to_dict(self):
        return {
            "project_description": self.project_description,
            "draft_submission": self.draft_submission,
            "risk_mapping": self.risk_mapping,
            "controls_mapping": self.controls_mapping,
            "mitigation_proposals": self.mitigation_proposals,
            "issues_list": self.issues_list,
            "decision_result": self.decision_result,
            "guardrail_violations": self.guardrail_violations,
            "ui_updates": self.ui_updates,
            "feedbacks": self.feedbacks,
            "status": self.status,
            "current_step": self.current_step,
        }

def save_context(context, path):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(context.to_dict(), f, indent=2)

def load_context(path):
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return WorkflowContext(**data)

# --- Load Data from JSON Files ---
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

with open(os.path.join(DATA_DIR, 'risks.json'), 'r', encoding='utf-8') as f:
    RISK_CATALOG = json.load(f)
with open(os.path.join(DATA_DIR, 'controls.json'), 'r', encoding='utf-8') as f:
    CONTROLS_CATALOG = json.load(f)
with open(os.path.join(DATA_DIR, 'guardrails.json'), 'r', encoding='utf-8') as f:
    GUARDRAIL_RULES = json.load(f)
with open(os.path.join(DATA_DIR, 'sample_submissions.json'), 'r', encoding='utf-8') as f:
    SAMPLE_SUBMISSIONS = json.load(f)

# --- Implemented FunctionTools ---
@function_tool
async def fetch_risk_catalog(wrapper: RunContextWrapper[WorkflowContext]) -> str:
    return json.dumps(RISK_CATALOG)

@function_tool
async def fetch_controls_catalog(wrapper: RunContextWrapper[WorkflowContext]) -> str:
    return json.dumps(CONTROLS_CATALOG)

@function_tool
async def fetch_past_submissions(wrapper: RunContextWrapper[WorkflowContext], query: str) -> str:
    # Return all submissions for agent-side filtering
    return json.dumps(SAMPLE_SUBMISSIONS)

@function_tool
async def fetch_past_mitigations(wrapper: RunContextWrapper[WorkflowContext], risk: str) -> str:
    # Return submissions with project_summary and mitigation entries
    results = []
    for sub in SAMPLE_SUBMISSIONS:
        for m in sub.get("mitigation", []):
            if m.get("risk") == risk:
                results.append({
                    "submissionId": sub["submissionId"],
                    "project_summary": sub["draft"]["project_summary"],
                    "control_id": m["control_id"],
                    "mitigation_steps": m["mitigation_steps"]
                })
    return json.dumps(results)

@function_tool
async def fetch_past_issues(wrapper: RunContextWrapper[WorkflowContext], text: str) -> str:
    # Return submissions with project_summary and issue entries
    results = []
    for sub in SAMPLE_SUBMISSIONS:
        for issue in sub.get("issues", []):
            if text.lower() in issue.get("issue", "").lower():
                results.append({
                    "submissionId": sub["submissionId"],
                    "project_summary": sub["draft"]["project_summary"],
                    **issue
                })
    return json.dumps(results)

@function_tool
async def fetch_guardrail_rules(wrapper: RunContextWrapper[WorkflowContext]) -> str:
    return json.dumps(GUARDRAIL_RULES)

@function_tool
async def evaluate_guardrails(wrapper: RunContextWrapper[WorkflowContext], step: str, content: str) -> str:
    """
    Use AI to evaluate guardrail compliance for the given step and content.
    Returns JSON list of violations.
    """
    prompt = (
        f"You are a guardrail evaluator. The current workflow step is '{step}' and the content is: {content}. "
        "Given these guardrail rules: {GUARDRAIL_RULES}, identify any rules violated. "
        "Respond with JSON array of {ruleId, description, severity}."
    )
    resp = await openai_client.chat.completions.create(
        model="gpt-4.1",
        messages=[{"role": "system", "content": "You evaluate guardrails compliance."},
                  {"role": "user", "content": prompt}]
    )
    # Assume model returns valid JSON
    return resp.choices[0].message.content

@function_tool
async def evaluate_approval(wrapper: RunContextWrapper[WorkflowContext], controls: List[AnyType], issues: List[AnyType]) -> str:
    """
    Use AI to decide approval or rejection based on controls and issues.
    Returns JSON {decision, rationale}.
    """
    # Debug: Print openai_client type and config
    #print("[DEBUG] openai_client type:", type(openai_client))
    #print("[DEBUG] openai_client config:", getattr(openai_client, '__dict__', str(openai_client)))
    prompt = (
        f"You are a risk approval assistant. We have controls: {controls} and issues: {issues}. "
        "Decide whether to APPROVE or REJECT the submission, and provide a brief rationale. "
        "Respond only with a JSON object like {\"decision\": \"Approved\"|\"Rejected\", \"rationale\": \"...\"}."
    )
    resp = await openai_client.chat.completions.create(
        model="gpt-4.1",
        messages=[{"role": "system", "content": "You assist in approval decisions."},
                  {"role": "user", "content": prompt}]
    )
    return resp.choices[0].message.content

# --- Agents Definitions ---
draft_agent = Agent[WorkflowContext](
    name="draft_agent",
    instructions=(
        "Generate a draft submission for the given project description. "
        "Return a JSON object with the following fields: "
        '{"project_title": str, "project_description": str, "objectives": [str], "benefits": [str], "deliverables": [str]}" '
        "Example: "
        '{"project_title": "...", "project_description": "...", "objectives": ["..."], "benefits": ["..."], "deliverables": ["..."]}'
    ),
    model=OpenAIChatCompletionsModel(
        model=azure_deployment,
        openai_client=openai_client
    ),
    tools=[fetch_past_submissions, fetch_guardrail_rules, evaluate_guardrails],
)
mapping_agent = Agent[WorkflowContext](
    name="mapping_agent",
    instructions=(
        "Depending on the project draft submission, identify key risks and return the risks and subrisks."
        "ONLY return a JSON array of objects, each with: "
        '{"risk": str, "category": str, "subrisk": str, "confidence": float}" '
        "Example: "
        '[{"risk": "System outage", "category": "Operational Risk", "subrisk": "System outage", "confidence": 0.92}]'
    ),
    model=OpenAIChatCompletionsModel(
        model=azure_deployment,
        openai_client=openai_client
    ),
    tools=[fetch_risk_catalog, fetch_past_submissions, fetch_guardrail_rules, evaluate_guardrails],
)
controls_agent = Agent[WorkflowContext](
    name="controls_agent",
    instructions=(
        "Map each identified risk to one or more relevant controls. "
        "Return a JSON array of objects, each with: "
        '{"risk": str, "controls": [{"control_id": str, "name": str, "relevance_score": float}]}' 
        "Example: "
        '[{"risk": "System outage", "controls": [{"control_id": "C002", "name": "High-Availability Architecture", "relevance_score": 0.92}]}]'
    ),
    model=OpenAIChatCompletionsModel(
        model=azure_deployment,
        openai_client=openai_client
    ),
    tools=[fetch_controls_catalog, fetch_past_submissions, fetch_guardrail_rules, evaluate_guardrails],
)
mitigation_agent = Agent[WorkflowContext](
    name="mitigation_agent",
    instructions=(
        "For each risk-control pair, propose mitigations. "
        "Return a JSON array of objects, each with: "
        '{"risk": str, "control_id": str, "mitigation_steps": [str]}'
        "Example: "
        '[{"risk": "System outage", "control_id": "C002", "mitigation_steps": ["Implement geo-redundancy", "Quarterly failover tests"]}]'
    ),
    model=OpenAIChatCompletionsModel(
        model=azure_deployment,
        openai_client=openai_client
    ),
    tools=[fetch_past_mitigations, fetch_guardrail_rules, evaluate_guardrails],
)
qa_agent = Agent[WorkflowContext](
    name="qa_agent",
    instructions=(
        "Flag issues in the draft submission and mitigation proposals. "
        "Return a JSON array of objects, each with: "
        '{"issue": str, "severity": str, "recommendation": str}'
        "Example: "
        '[{"issue": "No SLA defined for ML vendor", "severity": "High", "recommendation": "Draft and sign SLA"}]'
    ),
    model=OpenAIChatCompletionsModel(
        model=azure_deployment,
        openai_client=openai_client
    ),
    tools=[fetch_past_issues, fetch_guardrail_rules, evaluate_guardrails],
)
decision_agent = Agent[WorkflowContext](
    name="decision_agent",
    instructions=(
        "Decide approval or rejection based on controls and issues. "
        "Return ONLY a JSON object with: "
        '{"decision": "Approved"|"Rejected", "rationale": str}'
        "Example: "
        '{"decision": "Approved", "rationale": "All controls are mapped and no critical issues remain."}'
    ),
    model=OpenAIChatCompletionsModel(
                model=azure_deployment,
                openai_client=openai_client
            ),
    tools=[evaluate_approval],
)
guardrail_agent = Agent[WorkflowContext](
    name="guardrail_agent",
    instructions="Enforce guardrail rules before the final review of the risk submission. Return a JSON array of violations, if any.",
    model=OpenAIChatCompletionsModel(
                model=azure_deployment,
                openai_client=openai_client
            ),
    tools=[fetch_guardrail_rules, evaluate_guardrails],
)
orchestrator_agent = Agent[WorkflowContext](
    name="orchestrator_agent",
    instructions=(
        "You are orchestrating a risk workflow. Check the context for the current step." 
        "If you're given the project description, kick off the first step of the flow, which is to generate a draft submission."
        "If the draft submission is generated, use the risk mapping agent to generate a list of applicable risks based on risk catalog, past submissions, and draft submission."
        "If the risk mapping is done, use the controls agent to map risks to controls based on the controls catalog, past submissions, and draft submission."
        "If the controls mapping is done, use the mitigation agent to propose mitigations for each risk-control pair."
        "If the mitigation step is complete, use the QA agent to flag issues in the draft submission and mitigation proposals."
        "After the QA agent, use the decision agent to decide whether to approve or reject the submission based on controls and issues."
        "After each agent executes, exit the current sub-execution and share the agent output with the user."
        "After generating an output for the user to review the data as part of the current step, proceed to the next step."
        "After each step, return the data for each step as exactly how it was returned by the agent in JSON."
        "Make sure the output is valid JSON and does not contain any other text."
    ),
    model=OpenAIChatCompletionsModel(
                model=azure_deployment,
                openai_client=openai_client
            ),
    tools=[
        draft_agent.as_tool("generate_draft", "Generate draft submission"),
        mapping_agent.as_tool("map_risks", "Map risks"),
        controls_agent.as_tool("map_controls", "Map controls"),
        mitigation_agent.as_tool("generate_mitigations", "Generate mitigations"),
        qa_agent.as_tool("flag_issues", "Flag deficiencies"),
        decision_agent.as_tool("evaluate_decision", "Approve or reject"),
    ],
)

# --- Feedback Agent and Feedback Processing ---
feedback_agent = Agent[WorkflowContext](
    name="feedback_agent",
    instructions=(
        "You are a feedback processor. Given user feedback for a workflow step, update the workflow context as needed. "
        "If the feedback requires changes to previous steps, you may call other agents/tools to update the context. "
        "Return the updated context to the user as JSON."
    ),
    model=OpenAIChatCompletionsModel(
        model=azure_deployment,
        openai_client=openai_client
    ),
    tools=[
        draft_agent.as_tool("generate_draft", "Generate draft submission"),
        mapping_agent.as_tool("map_risks", "Map risks"),
        controls_agent.as_tool("map_controls", "Map controls"),
        mitigation_agent.as_tool("generate_mitigations", "Generate mitigations"),
        qa_agent.as_tool("flag_issues", "Flag deficiencies"),
        decision_agent.as_tool("evaluate_decision", "Approve or reject"),
    ],
)

async def process_feedback(context_id: str, step: str, feedback: str):
    """
    Process feedback for a given step using the feedback agent. Update context as needed.
    """
    output_dir = os.path.join(os.path.dirname(__file__), 'output')
    context_path = os.path.join(output_dir, f'workflow_context_{context_id}.json')
    if not os.path.exists(context_path):
        raise FileNotFoundError("Workflow context not found")
    context = load_context(context_path)
    # Store feedback
    context.feedbacks[step] = feedback
    # Call feedback agent to process feedback and update context
    feedback_input = json.dumps({
        "context": context.to_dict(),
        "step": step,
        "feedback": feedback
    })
    feedback_out = await Runner.run(
        feedback_agent,
        input=feedback_input
    )
    try:
        updated_context_dict = json.loads(feedback_out.final_output)
        updated_context = WorkflowContext(**updated_context_dict)
    except Exception:
        updated_context = context  # fallback if parsing fails
    save_context(updated_context, context_path)
    return updated_context

def trigger_feedback_api(context_id: str, step: str, feedback: str):
    return process_feedback(context_id, step, feedback)

# --- Refactor run_risk_workflow to remove feedback pausing ---
async def run_risk_workflow(project_description: str, context_id: str = None, interactive: bool = False):
    if context_id is None:
        context_id = str(uuid.uuid4())
    output_dir = os.path.join(os.path.dirname(__file__), 'output')
    os.makedirs(output_dir, exist_ok=True)
    context_path = os.path.join(output_dir, f'workflow_context_{context_id}.json')
    if os.path.exists(context_path):
        context = load_context(context_path)
    else:
        context = WorkflowContext(project_description=project_description)
    with trace("Risk Workflow with UI Context"):
        steps = [
            ("generate_draft", "Draft Submission"),
            ("map_risks", "Risk Mapping"),
            ("map_controls", "Control Mapping"),
            ("generate_mitigations", "Mitigation Proposal"),
            ("flag_issues", "QA Issues"),
            ("evaluate_decision", "Final Decision"),
        ]
        for idx, (step, label) in enumerate(steps):
            main_out = await Runner.run(
                orchestrator_agent,
                input=json.dumps(context.to_dict())
            )
            print(f"main_out: {main_out.final_output}")
            data = main_out.final_output
            if step in ["generate_draft", "map_risks", "map_controls", "generate_mitigations", "flag_issues", "evaluate_decision"]:
                try:
                    data = json.loads(data)
                except Exception as e:
                    print(f"Error parsing {step} output:", e)
            context.record_step(step, data)
            context.current_step = step
            save_context(context, context_path)
            # No feedback pausing here; feedback is handled separately
            # Only run guardrail agent before the final evaluation step
            if step == "flag_issues":
                guard_out = await Runner.run(
                    guardrail_agent,
                    input=f"Current step:{step}, project draft: {context.draft_submission}, output for guardrail evaluation: {data}",
                )
                v_data = guard_out.final_output
                context.record_guardrail(step, v_data)
                save_context(context, context_path)
                context = load_context(context_path)
    print("\n=== UI Progress Updates ===\n", json.dumps(context.ui_updates, indent=2))
    print("\n=== Final Decision ===\n", json.dumps(context.decision_result, indent=2))

    # Only show feedback prompt if interactive mode is enabled (i.e., terminal)
    if interactive:
        print("\n--- Feedback ---")
        print("You may now provide feedback for any step. Press Enter to skip.")
        steps_available = [s[0] for s in steps]
        print(f"Available steps: {', '.join(steps_available)}")
        step = input("Enter step name to provide feedback (or Enter to skip): ").strip()
        if step in steps_available:
            feedback = input(f"Enter feedback for step '{step}': ").strip()
            if feedback:
                updated_context = process_feedback(context_id, step, feedback)
                print(f"\n[Feedback processed for step '{step}']")
                print(json.dumps(updated_context.to_dict(), indent=2))
            else:
                print("No feedback entered. Workflow complete.")
        else:
            print("No feedback provided. Workflow complete.")

def review_and_feedback(run_result: Any, label: str, context: WorkflowContext = None, context_path: str = None):
    for item in run_result.new_items:
        if isinstance(item, MessageOutputItem):
            print(f"[Review {label}]\n{ItemHelpers.text_message_output(item)}")
            if context_path:
                print(f"You may edit {context_path} before providing feedback below.")
            fb = input("Feedback (or Enter to accept): ")
            if fb:
                context.record_step(label, run_result.final_output, feedback=fb)
                if context_path:
                    save_context(context, context_path)
                print(f"[Feedback for {label}]\n{fb}")
            else:
                print(f"[Accepted {label}]")
                if context_path:
                    save_context(context, context_path)

# --- API trigger for feedback (to be used in api.py) ---
def trigger_feedback_api(context_id: str, step: str, feedback: str):
    """
    API endpoint to trigger feedback processing via the feedback agent.
    """
    return process_feedback(context_id, step, feedback)

if __name__ == "__main__":
    desc = input("Project description: ")
    asyncio.run(run_risk_workflow(desc, interactive=True))
