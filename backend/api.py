from fastapi import FastAPI, HTTPException, Path, Query, Body, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
import uuid
import asyncio
import shutil
from pypdf import PdfReader
from agentic_rcsa import (
    run_risk_workflow, WorkflowContext, save_context, load_context,
    DATA_DIR, RISK_CATALOG, CONTROLS_CATALOG, GUARDRAIL_RULES, SAMPLE_SUBMISSIONS,
    trigger_feedback_api  # <-- import the new function
)
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify your frontend URL(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'output')

# --- Pydantic Models for CRUD ---
class ControlItem(BaseModel):
    control_id: str
    name: str
    description: Optional[str] = None
    # Add other fields as needed

class RiskItem(BaseModel):
    risk_id: str
    name: str
    category: Optional[str] = None
    # Add other fields as needed

class GuardrailItem(BaseModel):
    ruleId: str
    description: str
    severity: str
    # Add other fields as needed

class SampleSubmissionItem(BaseModel):
    submissionId: str
    draft: Dict[str, Any]
    mitigation: Optional[List[Dict[str, Any]]] = None
    issues: Optional[List[Dict[str, Any]]] = None
    # Add other fields as needed

class FeedbackRequest(BaseModel):
    step: str
    feedback: str

# --- Helper functions for file CRUD ---
def _load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def _save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

# --- Workflow Endpoints ---
@app.post('/workflow/start')
async def start_workflow(
    project_description: Optional[str] = Form(None),
    file: UploadFile = File(None),
    context_id: Optional[str] = Query(None)
):
    # Accept project_description from either Form (multipart) or Body (JSON)
    if project_description is None:
        try:
            # Try to get from JSON body
            from fastapi import Request
            import inspect
            frame = inspect.currentframe()
            request = None
            while frame:
                if 'request' in frame.f_locals:
                    request = frame.f_locals['request']
                    break
                frame = frame.f_back
            if request is not None:
                data = await request.json()
                project_description = data.get('project_description')
        except Exception:
            project_description = None
    if not project_description:
        raise HTTPException(status_code=400, detail="project_description is required (as form or JSON body)")
    # Handle file upload and PDF extraction
    uploads_dir = os.path.join(os.path.dirname(__file__), 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)
    file_content = ''
    file_path = None
    if file is not None:
        file_path = os.path.join(uploads_dir, f"{uuid.uuid4()}_{file.filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        # Only extract text if PDF
        if file.filename.lower().endswith('.pdf'):
            try:
                reader = PdfReader(file_path)
                file_content = "\n".join(page.extract_text() or '' for page in reader.pages)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to extract PDF text: {e}")
        else:
            # For non-PDFs, just note the file was uploaded
            file_content = f"[File '{file.filename}' uploaded, not a PDF]"
    # Combine project description and file content
    combined_description = project_description
    if file_content:
        combined_description += f"\n\n[File Content:]\n{file_content}"
    if not context_id:
        context_id = str(uuid.uuid4())
    asyncio.create_task(run_risk_workflow(combined_description, context_id))
    return {"context_id": context_id, "status": "started", "file_saved": bool(file_path), "file_path": file_path}

@app.get('/workflow/{context_id}')
def get_workflow(context_id: str = Path(...)):
    context_path = os.path.join(OUTPUT_DIR, f'workflow_context_{context_id}.json')
    if not os.path.exists(context_path):
        raise HTTPException(status_code=404, detail="Workflow not found")
    context = load_context(context_path)
    return context.to_dict()

@app.post('/workflow/{context_id}/feedback/agent')
async def post_feedback_agent(context_id: str, req: FeedbackRequest):
    """
    Process feedback using the standalone feedback agent. This will update the workflow context holistically.
    """
    try:
        asyncio.create_task(trigger_feedback_api(context_id, req.step, req.feedback))
        return {"status": "feedback processing started"}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Workflow context not found")
    
@app.get('/workflows')
def list_workflows():
    files = [f for f in os.listdir(OUTPUT_DIR) if f.startswith('workflow_context_') and f.endswith('.json')]
    return {"workflows": [f.replace('workflow_context_', '').replace('.json', '') for f in files]}

# --- Controls Catalog CRUD ---
CONTROLS_PATH = os.path.join(DATA_DIR, 'controls.json')

@app.get('/controls')
def get_controls():
    return _load_json(CONTROLS_PATH)

@app.post('/controls')
def add_control(item: ControlItem):
    controls = _load_json(CONTROLS_PATH)
    controls.append(item.dict())
    _save_json(CONTROLS_PATH, controls)
    return {"status": "added", "item": item}

@app.put('/controls/{control_id}')
def update_control(control_id: str, item: ControlItem):
    controls = _load_json(CONTROLS_PATH)
    for idx, c in enumerate(controls):
        if c.get('control_id') == control_id:
            controls[idx] = item.dict()
            _save_json(CONTROLS_PATH, controls)
            return {"status": "updated", "item": item}
    raise HTTPException(status_code=404, detail="Control not found")

@app.delete('/controls/{control_id}')
def delete_control(control_id: str):
    controls = _load_json(CONTROLS_PATH)
    controls = [c for c in controls if c.get('control_id') != control_id]
    _save_json(CONTROLS_PATH, controls)
    return {"status": "deleted"}

# --- Risk Catalog CRUD ---
RISK_PATH = os.path.join(DATA_DIR, 'risks.json')

@app.get('/risks')
def get_risks():
    return _load_json(RISK_PATH)

@app.post('/risks')
def add_risk(item: RiskItem):
    risks = _load_json(RISK_PATH)
    risks.append(item.dict())
    _save_json(RISK_PATH, risks)
    return {"status": "added", "item": item}

@app.put('/risks/{risk_id}')
def update_risk(risk_id: str, item: RiskItem):
    risks = _load_json(RISK_PATH)
    for idx, r in enumerate(risks):
        if r.get('risk_id') == risk_id:
            risks[idx] = item.dict()
            _save_json(RISK_PATH, risks)
            return {"status": "updated", "item": item}
    raise HTTPException(status_code=404, detail="Risk not found")

@app.delete('/risks/{risk_id}')
def delete_risk(risk_id: str):
    risks = _load_json(RISK_PATH)
    risks = [r for r in risks if r.get('risk_id') != risk_id]
    _save_json(RISK_PATH, risks)
    return {"status": "deleted"}

# --- Sample Submissions CRUD ---
SAMPLES_PATH = os.path.join(DATA_DIR, 'sample_submissions.json')

@app.get('/samples')
def get_samples():
    return _load_json(SAMPLES_PATH)

@app.post('/samples')
def add_sample(item: SampleSubmissionItem):
    samples = _load_json(SAMPLES_PATH)
    samples.append(item.dict())
    _save_json(SAMPLES_PATH, samples)
    return {"status": "added", "item": item}

@app.put('/samples/{submissionId}')
def update_sample(submissionId: str, item: SampleSubmissionItem):
    samples = _load_json(SAMPLES_PATH)
    for idx, s in enumerate(samples):
        if s.get('submissionId') == submissionId:
            samples[idx] = item.dict()
            _save_json(SAMPLES_PATH, samples)
            return {"status": "updated", "item": item}
    raise HTTPException(status_code=404, detail="Sample not found")

@app.delete('/samples/{submissionId}')
def delete_sample(submissionId: str):
    samples = _load_json(SAMPLES_PATH)
    samples = [s for s in samples if s.get('submissionId') != submissionId]
    _save_json(SAMPLES_PATH, samples)
    return {"status": "deleted"}

# --- Guardrails CRUD ---
GUARDRAILS_PATH = os.path.join(DATA_DIR, 'guardrails.json')

@app.get('/guardrails')
def get_guardrails():
    return _load_json(GUARDRAILS_PATH)

@app.post('/guardrails')
def add_guardrail(item: GuardrailItem):
    guardrails = _load_json(GUARDRAILS_PATH)
    guardrails.append(item.dict())
    _save_json(GUARDRAILS_PATH, guardrails)
    return {"status": "added", "item": item}

@app.put('/guardrails/{ruleId}')
def update_guardrail(ruleId: str, item: GuardrailItem):
    guardrails = _load_json(GUARDRAILS_PATH)
    for idx, g in enumerate(guardrails):
        if g.get('ruleId') == ruleId:
            guardrails[idx] = item.dict()
            _save_json(GUARDRAILS_PATH, guardrails)
            return {"status": "updated", "item": item}
    raise HTTPException(status_code=404, detail="Guardrail not found")

@app.delete('/guardrails/{ruleId}')
def delete_guardrail(ruleId: str):
    guardrails = _load_json(GUARDRAILS_PATH)
    guardrails = [g for g in guardrails if g.get('ruleId') != ruleId]
    _save_json(GUARDRAILS_PATH, guardrails)
    return {"status": "deleted"}
