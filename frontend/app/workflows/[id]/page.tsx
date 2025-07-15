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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="container mx-auto max-w-7xl">
        {/* Header with better spacing and background */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 shadow-sm">
          <div className="px-6 py-8">
            <WorkflowHeader
              id={id}
              title={workflowContext.draft_submission?.project_title || "Untitled Project"}
              description={workflowContext.project_description}
              status={displayStatus}
            />
            
            {/* Action buttons integrated into header */}
            <div className="mt-6 flex justify-between items-center">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Workflow ID: {id}</span>
                <span>•</span>
                <span>Created: {new Date(workflowContext.createdAt || Date.now()).toLocaleDateString()}</span>
              </div>
              <Link href={`/workflows/${id}/edit`}>
                <Button variant="outline" className="hover:bg-gray-50 border-gray-200">
                  Edit Workflow
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Main content with better spacing */}
        <div className="px-6 py-8">
          <WorkflowSteps workflowContext={workflowContext} workflowId={id} />
        </div>
      </div>
    </div>
  )
}
