import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Clock, CheckCircle, AlertCircle } from "lucide-react"
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
    <div className="glass-card rounded-2xl p-8 mb-8 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/workflows">
          <Button variant="ghost" size="sm" className="gap-2 hover:bg-white/50 rounded-xl transition-all duration-300">
            <ChevronLeft className="h-4 w-4" />
            Back to Workflows
          </Button>
        </Link>
        <StatusBadge status={status} />
      </div>
      
      <div className="space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {title}
        </h1>
        
        {description && (
          <p className="text-lg text-gray-600 leading-relaxed max-w-4xl">
            {showFull || !isTruncated ? description : firstSentence}
            {isTruncated && (
              <button
                className="ml-2 text-sm underline text-blue-600 cursor-pointer hover:text-blue-800 transition-colors"
                onClick={() => setShowFull((v) => !v)}
                type="button"
              >
                {showFull ? "Show less" : "Show more"}
              </button>
            )}
          </p>
        )}
        
        <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg inline-block">
          Workflow ID: {id}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status.toLowerCase()) {
    case "approved":
      return (
        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 rounded-full px-4 py-2 shadow-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Approved
        </Badge>
      )
    case "rejected":
      return (
        <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 rounded-full px-4 py-2 shadow-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Rejected
        </Badge>
      )
    case "awaiting_feedback":
      return (
        <Badge className="bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 rounded-full px-4 py-2 shadow-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Feedback Needed
        </Badge>
      )
    default:
      return (
        <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 rounded-full px-4 py-2 shadow-sm">
          In Progress
        </Badge>
      )
  }
}
