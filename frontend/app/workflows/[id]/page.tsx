"use client"
import { useEffect, useState } from "react"
import WorkflowHeader from "@/components/workflow-header"
import WorkflowSteps from "@/components/workflow-steps"
import WorkflowLoading from "@/components/workflow-loading"
import { getWorkflowContext } from "@/lib/workflow-service"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function WorkflowDetailPage({ params }: { params: { id: string } }) {
  const [workflowContext, setWorkflowContext] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let isMounted = true
    let interval: NodeJS.Timeout | null = null

    async function fetchContext() {
      try {
        const ctx = await getWorkflowContext(params.id)
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
  }, [params.id])

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
    <main className="container mx-auto py-8 px-4">
      <WorkflowHeader
        id={params.id}
        title={workflowContext.draft_submission?.project_title || "Untitled Project"}
        description={workflowContext.project_description}
        status={displayStatus}
      />
      {/* Edit button under the header, right-aligned */}
      <div className="mb-6 flex justify-end">
        <Link href={`/workflows/${params.id}/edit`}>
          <Button className="bg-black text-white hover:bg-neutral-800" variant="default" size="sm">Edit</Button>
        </Link>
      </div>
      <WorkflowSteps workflowContext={workflowContext} workflowId={params.id} />
    </main>
  )
}
