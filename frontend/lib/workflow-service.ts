import type { WorkflowContext, Workflow } from "./types"
import { getWorkflow, listWorkflows } from "./api-client"

export async function getWorkflows({
  limit,
  status,
  search,
}: {
  limit?: number
  status?: string
  search?: string
}): Promise<Workflow[]> {
  try {
    // Get the list of workflow IDs
    const data = await listWorkflows()
    const workflowIds = data.workflows || []

    // Fetch details for each workflow
    const workflowPromises = workflowIds.map(async (id: string) => {
      try {
        const workflowData = await getWorkflow(id)

        // Extract workflow metadata
        const title = workflowData.draft_submission?.project_title || "Untitled Project"
        const description = workflowData.project_description || ""

        // Determine status based on workflow status
        let workflowStatus = "active"
        if (workflowData.status === "completed") {
          workflowStatus =
            workflowData.decision_result?.decision?.toLowerCase() === "approved" ? "approved" : "rejected"
        } else if (workflowData.status === "awaiting_feedback") {
          workflowStatus = "awaiting_feedback"
        }

        // Apply status filter
        if (status && status !== "all" && status !== workflowStatus) {
          return null
        }

        // Apply search filter
        if (search) {
          const searchLower = search.toLowerCase()
          if (!title.toLowerCase().includes(searchLower) && !description.toLowerCase().includes(searchLower)) {
            return null
          }
        }

        // Create workflow object
        return {
          id,
          title,
          description,
          status: workflowStatus,
          createdAt: new Date().toISOString(), // This should come from the API in a real implementation
          updatedAt: new Date().toISOString(), // This should come from the API in a real implementation
        }
      } catch (error) {
        console.error(`Error fetching workflow ${id}:`, error)
        return null
      }
    })

    const workflows = await Promise.all(workflowPromises)

    // Filter out null values and apply limit
    const filteredWorkflows = workflows.filter(Boolean) as Workflow[]

    // Sort by updatedAt (newest first)
    filteredWorkflows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    // Apply limit
    if (limit && limit > 0) {
      return filteredWorkflows.slice(0, limit)
    }

    return filteredWorkflows
  } catch (error) {
    console.error("Error fetching workflows:", error)
    throw error
  }
}

export async function getWorkflowContext(id: string): Promise<WorkflowContext> {
  try {
    return await getWorkflow(id)
  } catch (error) {
    console.error(`Error fetching workflow ${id}:`, error)
    throw error
  }
}
