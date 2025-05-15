export interface WorkflowContext {
  project_description: string
  draft_submission: any
  risk_mapping: any[]
  controls_mapping: any[]
  mitigation_proposals: any[]
  issues_list: any[]
  decision_result: any
  guardrail_violations: Record<string, any[]>
  ui_updates: Array<{ step: string; output: any }>
  feedbacks: Record<string, string>
  status: "in_progress" | "awaiting_feedback" | "completed"
  current_step: string
  updatedAt?: string // Add updatedAt for tracking edits
}

export interface Workflow {
  id: string
  title: string
  description: string
  status: string
  createdAt: string
  updatedAt: string
}
