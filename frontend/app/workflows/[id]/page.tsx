"use client"

import { useEffect, useState } from "react"
import WorkflowHeader from "@/components/workflow-header"
import WorkflowSteps from "@/components/workflow-steps"
import WorkflowLoading from "@/components/workflow-loading"
import { getWorkflowContext } from "@/lib/workflow-service"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useParams } from "next/navigation"

export default function WorkflowDetailPage() {
  const params = useParams() as { id: string | string[] }
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const [workflowContext, setWorkflowContext] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let isMounted = true
    let interval: NodeJS.Timeout | null = null

    async function fetchContext() {
      try {
        const ctx = await getWorkflowContext(id)
        if (isMounted) {
          setWorkflowContext(ctx)
          setLoading(false)
          if (interval) clearInterval(interval)
        }
      } catch (err: any) {
        if (isMounted) {
          setWorkflowContext(null)
          setLoading(true)
          setError("")
        }
      }
    }

    fetchContext()
    interval = setInterval(fetchContext, 2000)
    return () => {
      isMounted = false
      if (interval) clearInterval(interval)
    }
  }, [id])

  if (loading || !workflowContext) {
    return <WorkflowLoading />
  }

  let displayStatus = workflowContext.status
  if (workflowContext.status === "completed" && workflowContext.decision_result?.decision) {
    displayStatus = workflowContext.decision_result.decision.toLowerCase()
  } else if (workflowContext.status === "awaiting_feedback") {
    displayStatus = "awaiting_feedback"
  }

  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto max-w-7xl">
        <WorkflowHeader
          id={id}
          title={workflowContext.draft_submission?.project_title || "Untitled Project"}
          description={workflowContext.project_description}
          status={displayStatus}
        />
        
        {/* Edit button with modern styling */}
        <div className="mb-8 flex justify-end">
          <Link href={`/workflows/${id}/edit`}>
            <Button className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-6 py-2 rounded-xl">
              Edit Workflow
            </Button>
          </Link>
        </div>
        
        <WorkflowSteps workflowContext={workflowContext} workflowId={id} />
      </div>
    </div>
  )
}
