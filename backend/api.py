from fastapi import FastAPI, HTTPException, Path, Query, Body, UploadFile, File, Form, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
import uuid
import asyncio
import shutil
import requests
from pypdf import PdfReader
from openai import AzureOpenAI
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
    id: str
    name: str
    description: Optional[str] = None
    subriskIds: Optional[List[str]] = None

class RiskItem(BaseModel):
    id: str
    category: str
    subrisk: Optional[str] = None
    description: Optional[str] = None

class GuardrailItem(BaseModel):
    id: str
    description: str
    severity: str
    applicableSteps: Optional[List[str]] = None

class SampleSubmissionItem(BaseModel):
    submissionId: str
    draft: Dict[str, Any]
    mitigation: Optional[List[Dict[str, Any]]] = None
    issues: Optional[List[Dict[str, Any]]] = None
    # Add other fields as needed

class FeedbackRequest(BaseModel):
    step: str
    feedback: str

class ProjectDescriptionBody(BaseModel):
    project_description: str

# Conversation models
class ConversationMessage(BaseModel):
    id: str
    role: str  # "user" or "assistant"
    content: str
    timestamp: str
    type: str  # "text", "audio", or "mixed"

class ConversationContext(BaseModel):
    conversationId: str
    sessionId: Optional[str] = None
    messages: List[ConversationMessage]
    status: str  # "active", "completed", or "error"
    createdAt: str
    updatedAt: str
    metadata: Dict[str, Any]

class GenerateDraftFromConversationRequest(BaseModel):
    conversationId: str
    messages: List[ConversationMessage]

# --- Helper functions for file CRUD ---
def _load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def _save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

# --- Workflow Endpoints ---
async def get_project_description(
    project_description: Optional[str] = Form(None),
    file: UploadFile = File(None),
    request: Request = None
) -> dict:
    """
    Dependency to get project_description from either form or JSON body.
    Returns dict with keys: project_description, file
    """
    if project_description is not None:
        return {"project_description": project_description, "file": file}
    if request is not None:
        try:
            data = await request.json()
            pd = data.get("project_description")
            if pd:
                return {"project_description": pd, "file": None}
        except Exception:
            pass
    raise HTTPException(status_code=400, detail="project_description is required (as form or JSON body)")

@app.post('/workflow/start')
async def start_workflow(
    deps: dict = Depends(get_project_description)
):
    project_description = deps["project_description"]
    file = deps["file"]
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

@app.put('/workflow/{context_id}')
def update_workflow(context_id: str, updated_context: dict = Body(...)):
    """
    Update the workflow context JSON file with new values. Only allows updating editable fields.
    """
    context_path = os.path.join(OUTPUT_DIR, f'workflow_context_{context_id}.json')
    if not os.path.exists(context_path):
        raise HTTPException(status_code=404, detail="Workflow not found")
    # Load existing context
    with open(context_path, 'r', encoding='utf-8') as f:
        context = json.load(f)
    # Define non-editable/system fields
    non_editable_fields = {'id', 'createdAt', 'context_id'}
    # Update only allowed fields
    for key, value in updated_context.items():
        if key not in non_editable_fields:
            context[key] = value
    # Update timestamp
    from datetime import datetime
    context['updatedAt'] = datetime.utcnow().isoformat() + 'Z'
    # Save updated context
    with open(context_path, 'w', encoding='utf-8') as f:
        json.dump(context, f, indent=2)
    return context

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
        if c.get('id') == control_id:
            controls[idx] = item.dict()
            _save_json(CONTROLS_PATH, controls)
            return {"status": "updated", "item": item}
    raise HTTPException(status_code=404, detail="Control not found")

@app.delete('/controls/{control_id}')
def delete_control(control_id: str):
    controls = _load_json(CONTROLS_PATH)
    controls = [c for c in controls if c.get('id') != control_id]
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
        if r.get('id') == risk_id:
            risks[idx] = item.dict()
            _save_json(RISK_PATH, risks)
            return {"status": "updated", "item": item}
    raise HTTPException(status_code=404, detail="Risk not found")

@app.delete('/risks/{risk_id}')
def delete_risk(risk_id: str):
    risks = _load_json(RISK_PATH)
    risks = [r for r in risks if r.get('id') != risk_id]
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

@app.put('/guardrails/{guardrail_id}')
def update_guardrail(guardrail_id: str, item: GuardrailItem):
    guardrails = _load_json(GUARDRAILS_PATH)
    for idx, g in enumerate(guardrails):
        if g.get('id') == guardrail_id:
            guardrails[idx] = item.dict()
            _save_json(GUARDRAILS_PATH, guardrails)
            return {"status": "updated", "item": item}
    raise HTTPException(status_code=404, detail="Guardrail not found")

@app.delete('/guardrails/{guardrail_id}')
def delete_guardrail(guardrail_id: str):
    guardrails = _load_json(GUARDRAILS_PATH)
    guardrails = [g for g in guardrails if g.get('id') != guardrail_id]
    _save_json(GUARDRAILS_PATH, guardrails)
    return {"status": "deleted"}

@app.post("/openai/realtime-session")
async def get_realtime_ephemeral_key():
    api_key = os.environ["AZURE_OPENAI_API_KEY"]
    endpoint = os.environ["AZURE_OPENAI_ENDPOINT"].rstrip("/")
    deployment = os.environ["AZURE_OPENAI_REALTIME_DEPLOYMENT"]
    url = f"{endpoint}/openai/realtimeapi/sessions?api-version=2025-04-01-preview"
    body = {
    "model": deployment,
    "voice": "verse",
    "instructions": """
    You are a risk-aware business analyst—friendly, efficient, and knowledgeable about OSFI requirements—conducting a 60-second interview to collect essential project details. Maintain a professional yet conversational tone, with mild encouragement and occasional filler to humanize the dialogue. Follow these steps, confirming key details as you go:

    1. Greet and intro: “Hi, I’m a business analyst preparing a risk assessment. I have a few quick questions.”
    2. Project Title: “What’s the project called?”
    3. Objectives & Urgency: “What are the main goals, and why is this happening now?”
    4. Core Features & Scope: “What key features or functions? Anything out of scope?”
    5. End Users: “Who will use this? Approximate numbers and locations?”
    6. Tech & Integrations: “Which platforms or systems? Any critical integrations?”
    7. Sensitive Data & Flags: “Will you handle PII/financial data or cross-border flows?”
    8. Wrap Up: “Thanks—that’s very helpful. I’ll summarize and move to the formal risk review next.”
    """
    }

    headers = {
        "api-key": api_key,
        "Content-Type": "application/json"
    }
    resp = requests.post(url, headers=headers, json=body)
    if resp.status_code != 200:
        return JSONResponse(status_code=500, content={"error": resp.text})
    return resp.json()

# --- Conversation Storage Endpoints ---
CONVERSATIONS_DIR = os.path.join(os.path.dirname(__file__), 'conversations')

async def analyze_conversation_with_gpt4(messages: List[ConversationMessage]) -> str:
    """
    Use GPT-4 to intelligently analyze the conversation and extract a structured project description.
    """
    try:
        # Initialize Azure OpenAI client using the same approach as agentic_rcsa.py
        client = AzureOpenAI(
            api_key=os.environ["AZURE_OPENAI_API_KEY"],
            api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-01"),
            azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"]
        )
        
        # Format conversation for analysis
        conversation_text = ""
        for message in messages:
            role_label = "User" if message.role == "user" else "AI Assistant"
            conversation_text += f"{role_label}: {message.content}\n\n"
        
        # Prompt for GPT-4 to analyze the conversation
        analysis_prompt = f"""
You are a project analysis expert. Please analyze the following conversation between a user and an AI assistant about a project they want to submit for risk assessment. 

Extract and synthesize the key information to create a comprehensive, well-structured project description that includes:

1. **Project Title/Name** - A clear, descriptive title
2. **Objective/Purpose** - What the project aims to achieve
3. **Scope** - What is included and excluded
4. **Key Activities** - Main tasks and deliverables
5. **Timeline** - Any mentioned timeframes or milestones
6. **Target Audience/Impact** - Who will be affected
7. **Technology/Systems** - Any technical components mentioned
8. **Business Value** - Expected benefits or outcomes
9. **Dependencies** - Any mentioned prerequisites or dependencies

Format the output as a professional project description that would be suitable for risk assessment. Be comprehensive but concise. If certain information wasn't discussed, note that it needs to be clarified.

**Conversation to analyze:**

{conversation_text}

**Please provide a structured project description:**
"""
        
        response = await client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {"role": "system", "content": "You are a project analysis expert who specializes in extracting structured project information from conversations for risk assessment purposes."},
                {"role": "user", "content": analysis_prompt}
            ],
            temperature=0.3,
            max_tokens=2000
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"Error analyzing conversation with GPT-4: {e}")
        # Fallback to simple concatenation if GPT-4 analysis fails
        fallback_description = "**Project Description (extracted from conversation):**\n\n"
        for message in messages:
            role_label = "User" if message.role == "user" else "AI Assistant"
            fallback_description += f"{role_label}: {message.content}\n\n"
        fallback_description += "\n*Note: This project description was automatically extracted from a conversation and may need manual review.*"
        return fallback_description

@app.post('/save-conversation')
async def save_conversation(conversation: ConversationContext):
    """
    Save conversation context to a JSON file, similar to workflow storage.
    """
    # Ensure conversations directory exists
    os.makedirs(CONVERSATIONS_DIR, exist_ok=True)
    
    # Save conversation as JSON file
    conversation_path = os.path.join(CONVERSATIONS_DIR, f'conversation_{conversation.conversationId}.json')
    
    with open(conversation_path, 'w', encoding='utf-8') as f:
        json.dump(conversation.dict(), f, indent=2)
    
    return {"status": "saved", "conversationId": conversation.conversationId, "path": conversation_path}

@app.get('/conversations')
def list_conversations():
    """
    List all stored conversations.
    """
    if not os.path.exists(CONVERSATIONS_DIR):
        return {"conversations": []}
    
    files = [f for f in os.listdir(CONVERSATIONS_DIR) if f.startswith('conversation_') and f.endswith('.json')]
    conversations = []
    
    for file in files:
        conversation_id = file.replace('conversation_', '').replace('.json', '')
        file_path = os.path.join(CONVERSATIONS_DIR, file)
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                conversation_data = json.load(f)
                conversations.append({
                    "conversationId": conversation_id,
                    "status": conversation_data.get("status", "unknown"),
                    "messageCount": conversation_data.get("metadata", {}).get("totalMessages", 0),
                    "createdAt": conversation_data.get("createdAt"),
                    "updatedAt": conversation_data.get("updatedAt")
                })
        except Exception as e:
            print(f"Error reading conversation {file}: {e}")
            continue
    
    return {"conversations": conversations}

@app.get('/conversations/{conversation_id}')
def get_conversation(conversation_id: str):
    """
    Get a specific conversation by ID.
    """
    conversation_path = os.path.join(CONVERSATIONS_DIR, f'conversation_{conversation_id}.json')
    
    if not os.path.exists(conversation_path):
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    with open(conversation_path, 'r', encoding='utf-8') as f:
        conversation_data = json.load(f)
    
    return conversation_data

@app.post('/generate-draft-from-conversation')
async def generate_draft_from_conversation(request: GenerateDraftFromConversationRequest):
    """
    Generate a project draft from conversation history by using GPT-4 to intelligently analyze 
    the conversation and extract a structured project description.
    """
    try:
        # Use GPT-4 to intelligently analyze the conversation
        project_description = await analyze_conversation_with_gpt4(request.messages)
        
        # Add metadata about the conversation source
        project_description += f"\n\n---\n*Generated from conversational intake session: {request.conversationId}*\n*Analysis performed on: {asyncio.get_event_loop().time()}*"
        
    except Exception as e:
        print(f"Error in GPT-4 analysis, falling back to simple extraction: {e}")
        # Fallback to simple concatenation if analysis fails
        conversation_text = ""
        for message in request.messages:
            role_label = "User" if message.role == "user" else "AI Assistant"
            conversation_text += f"{role_label}: {message.content}\n\n"
        
        project_description = f"""Project Description (extracted from conversation):

{conversation_text}

[This project description was generated from a conversational intake session with conversation ID: {request.conversationId}]"""
    
    # Start a new workflow with the intelligently-analyzed project description
    context_id = str(uuid.uuid4())
    
    # Start the workflow asynchronously
    asyncio.create_task(run_risk_workflow(project_description, context_id))
    
    # Return the workflow context ID so the frontend can redirect to the workflow view
    return {
        "status": "draft_generation_started",
        "context_id": context_id,
        "conversationId": request.conversationId,
        "message": f"Project draft generation started from conversation {request.conversationId}. GPT-4 analysis completed. You can track progress using context ID: {context_id}"
    }

@app.delete('/conversations/{conversation_id}')
def delete_conversation(conversation_id: str):
    """
    Delete a conversation.
    """
    conversation_path = os.path.join(CONVERSATIONS_DIR, f'conversation_{conversation_id}.json')
    
    if not os.path.exists(conversation_path):
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    os.remove(conversation_path)
    return {"status": "deleted", "conversationId": conversation_id}
