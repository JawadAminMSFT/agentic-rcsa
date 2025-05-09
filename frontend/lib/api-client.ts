// This file handles all API calls to the FastAPI backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Helper function for API calls
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `API call failed: ${response.status}`)
    }

    return response.json()
  } catch (error) {
    console.error(`API call to ${endpoint} failed:`, error)
    throw error
  }
}

// Workflow API calls
export async function startWorkflow(projectDescription: string) {
  return fetchAPI("/workflow/start", {
    method: "POST",
    body: JSON.stringify(projectDescription),
  })
}

export async function getWorkflow(contextId: string) {
  return fetchAPI(`/workflow/${contextId}`)
}

export async function listWorkflows() {
  return fetchAPI("/workflows")
}

// Updated to use the new feedback agent endpoint
export async function submitWorkflowFeedback(contextId: string, step: string, feedback: string) {
  return fetchAPI(`/workflow/${contextId}/feedback/agent`, {
    method: "POST",
    body: JSON.stringify({ step, feedback }),
  })
}

// Controls API calls
export async function getControls() {
  return fetchAPI("/controls")
}

export async function addControl(control: any) {
  return fetchAPI("/controls", {
    method: "POST",
    body: JSON.stringify(control),
  })
}

export async function updateControl(controlId: string, control: any) {
  return fetchAPI(`/controls/${controlId}`, {
    method: "PUT",
    body: JSON.stringify(control),
  })
}

export async function deleteControl(controlId: string) {
  return fetchAPI(`/controls/${controlId}`, {
    method: "DELETE",
  })
}

// Risk API calls
export async function getRisks() {
  return fetchAPI("/risks")
}

export async function addRisk(risk: any) {
  return fetchAPI("/risks", {
    method: "POST",
    body: JSON.stringify(risk),
  })
}

export async function updateRisk(riskId: string, risk: any) {
  return fetchAPI(`/risks/${riskId}`, {
    method: "PUT",
    body: JSON.stringify(risk),
  })
}

export async function deleteRisk(riskId: string) {
  return fetchAPI(`/risks/${riskId}`, {
    method: "DELETE",
  })
}

// Sample Submissions API calls
export async function getSamples() {
  return fetchAPI("/samples")
}

// Guardrails API calls
export async function getGuardrails() {
  return fetchAPI("/guardrails")
}
