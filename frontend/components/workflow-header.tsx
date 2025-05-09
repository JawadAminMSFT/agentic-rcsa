import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Clock } from "lucide-react"
import { useState } from "react"

interface WorkflowHeaderProps {
  id: string
  title: string
  description: string
  status: string
}

export default function WorkflowHeader({ id, title, description, status }: WorkflowHeaderProps) {
  // Truncate to first sentence or 120 chars, with show more/less
  const [showFull, setShowFull] = useState(false)
  const firstSentence = description?.split(/(?<=[.!?])\s/)[0] || ""
  const isTruncated = description && description.length > firstSentence.length
  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/workflows">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <StatusBadge status={status} />
      </div>
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-1 max-w-3xl">
          {showFull || !isTruncated ? description : firstSentence}
          {isTruncated && (
            <button
              className="ml-2 text-xs underline text-primary cursor-pointer"
              onClick={() => setShowFull((v) => !v)}
              type="button"
            >
              {showFull ? "Show less" : "Show more"}
            </button>
          )}
        </p>
      </div>
      <div className="text-sm text-muted-foreground">Workflow ID: {id}</div>
    </div>
  )
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
    case "completed":
      return <Badge className="bg-green-500">Completed</Badge>
    default:
      return <Badge variant="outline">In Progress</Badge>
  }
}
