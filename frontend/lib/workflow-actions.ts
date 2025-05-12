"use server"

import { revalidatePath } from "next/cache"
import { startWorkflow as apiStartWorkflow, submitWorkflowFeedback } from "./api-client"

export async function createWorkflow(projectDescription: string, file?: File | null): Promise<string> {
  try {
    const response = await apiStartWorkflow(projectDescription, file)
    return response.context_id
  } catch (error) {
    console.error("Error creating workflow:", error)
    throw new Error("Failed to create workflow. Please try again.")
  }
}

export async function submitFeedback(workflowId: string, step: string, feedback: string): Promise<void> {
  try {
    // Updated to use the new feedback agent endpoint
    await submitWorkflowFeedback(workflowId, step, feedback)

    // Revalidate the workflow page to show updated data
    revalidatePath(`/workflows/${workflowId}`)
  } catch (error) {
    console.error("Error submitting feedback:", error)
    throw new Error("Failed to submit feedback. Please try again.")
  }
}
