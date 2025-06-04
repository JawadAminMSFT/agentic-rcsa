"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, FileText, Plus, Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { formatDistanceToNow } from "date-fns"
import { getWorkflows } from "@/lib/workflow-service"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface WorkflowListProps {
  status?: string
  search?: string
}

export default function WorkflowList({ status, search }: WorkflowListProps = {}) {
  const [searchTerm, setSearchTerm] = useState(search || "")
  const [filterStatus, setFilterStatus] = useState<"all" | "in_progress">(
    status === "active" ? "in_progress" : "all"
  )
  const [workflows, setWorkflows] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchWorkflows() {
      try {
        const data = await getWorkflows({ limit: 100, status: filterStatus, search: searchTerm })
        setWorkflows(data)
      } catch (err) {
        setError("Failed to load workflows. Please try again later.")
        console.error("Error fetching workflows:", err)
      }
    }

    fetchWorkflows()
  }, [filterStatus, searchTerm])

  const filteredWorkflows = workflows.filter((workflow) => {
    return (
      workflow.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/* Workflows Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filteredWorkflows.map((workflow) => (
          <Link key={workflow.id} href={`/workflows/${workflow.id}`}>
            <Card className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-sm font-medium text-gray-900 group-hover:text-gray-700 transition-colors line-clamp-2">
                      {workflow.title}
                    </CardTitle>
                    <p className="text-xs text-gray-500 mt-1">
                      ID: {workflow.id}
                    </p>
                  </div>
                  <StatusBadge status={workflow.status} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {workflow.description || "No description available"}
                  </p>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {workflow.current_step}
                    </div>
                  </div>
                  
                  {/* Progress Indicator */}
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-1.5 bg-gray-600 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage(workflow.current_step)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredWorkflows.length === 0 && (
        <div className="bg-white rounded-lg p-8 text-center shadow-sm border border-gray-200">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-2">No workflows found</h3>
          <p className="text-xs text-gray-600 mb-4">
            {searchTerm || filterStatus !== "all"
              ? "Try adjusting your search or filter criteria"
              : "Get started by creating your first risk assessment workflow"}
          </p>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status.toLowerCase()) {
    case "approved":
      return (
        <Badge className="bg-green-50 text-green-700 border border-green-200 rounded-md px-2 py-1 text-xs">
          Approved
        </Badge>
      )
    case "rejected":
      return (
        <Badge className="bg-red-50 text-red-700 border border-red-200 rounded-md px-2 py-1 text-xs">
          Rejected
        </Badge>
      )
    case "awaiting_feedback":
      return (
        <Badge className="bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2 py-1 text-xs flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Feedback Needed
        </Badge>
      )
    default:
      return (
        <Badge className="bg-blue-50 text-blue-700 border border-blue-200 rounded-md px-2 py-1 text-xs">
          In Progress
        </Badge>
      )
  }
}

function getProgressPercentage(currentStep: string): number {
  const steps = [
    "generate_draft",
    "map_risks", 
    "map_controls",
    "generate_mitigations",
    "flag_issues",
    "evaluate_decision"
  ]
  
  const stepIndex = steps.indexOf(currentStep)
  return stepIndex === -1 ? 0 : Math.round(((stepIndex + 1) / steps.length) * 100)
}
