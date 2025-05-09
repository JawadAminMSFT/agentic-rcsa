import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getWorkflows } from "@/lib/workflow-service"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Clock } from "lucide-react"

interface WorkflowListProps {
  limit?: number
  status?: string
  search?: string
}

export default async function WorkflowList({ limit, status, search }: WorkflowListProps) {
  try {
    const workflows = await getWorkflows({ limit, status, search })

    if (workflows.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No workflows found</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {workflows.map((workflow) => (
          <Link key={workflow.id} href={`/workflows/${workflow.id}`}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-medium">{workflow.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{workflow.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
                    </div>
                    <StatusBadge status={workflow.status} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    )
  } catch (error) {
    console.error("Error in WorkflowList:", error)
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load workflows. The API server may be unavailable.
          {error instanceof Error && ` Error: ${error.message}`}
        </AlertDescription>
      </Alert>
    )
  }
}

function StatusBadge({ status }: { status: string }) {
  switch (status.toLowerCase()) {
    case "approved":
      return <Badge className="bg-green-500">Approved</Badge>
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>
    case "awaiting_feedback":
      return (
        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Feedback Needed
        </Badge>
      )
    default:
      return <Badge variant="outline">In Progress</Badge>
  }
}
