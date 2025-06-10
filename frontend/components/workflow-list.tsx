"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, FileText, Plus, CheckCircle, AlertTriangle, PlayCircle } from "lucide-react"
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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-slate-50 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500 rounded-lg">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Risk Assessment Workflows
            </h2>
            <p className="text-gray-600 text-sm">Manage and track your risk assessment processes</p>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {workflows.filter(w => w.status === 'approved').length}
                </p>
                <p className="text-xs text-gray-600">Approved</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <PlayCircle className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {workflows.filter(w => w.status === 'active').length}
                </p>
                <p className="text-xs text-gray-600">In Progress</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {workflows.filter(w => w.status === 'awaiting_feedback').length}
                </p>
                <p className="text-xs text-gray-600">Awaiting Review</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workflows Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredWorkflows.map((workflow) => (
          <Link key={workflow.id} href={`/workflows/${workflow.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-semibold text-gray-900 line-clamp-2">
                    {workflow.title}
                  </CardTitle>
                  <StatusBadge status={workflow.status} />
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {workflow.description || "No description available"}
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>
                      {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {filteredWorkflows.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-8 text-center border">
          <div className="mx-auto w-16 h-16 bg-gray-400 rounded-lg flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No workflows found</h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            {searchTerm || filterStatus !== "all"
              ? "Try adjusting your search or filter criteria"
              : "Get started by creating your first risk assessment workflow"}
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Workflow
          </Button>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants = {
    active: "bg-blue-500 text-white",
    approved: "bg-green-500 text-white",
    rejected: "bg-red-500 text-white",
    awaiting_feedback: "bg-amber-500 text-white",
    default: "bg-gray-500 text-white"
  }

  const icons = {
    active: <PlayCircle className="w-3 h-3 mr-1" />,
    approved: <CheckCircle className="w-3 h-3 mr-1" />,
    rejected: <AlertTriangle className="w-3 h-3 mr-1" />,
    awaiting_feedback: <Clock className="w-3 h-3 mr-1" />,
    default: <FileText className="w-3 h-3 mr-1" />
  }

  const variant = variants[status as keyof typeof variants] || variants.default
  const icon = icons[status as keyof typeof icons] || icons.default

  return (
    <Badge className={`${variant} text-xs flex items-center`}>
      {icon}
      {status.replace('_', ' ').toUpperCase()}
    </Badge>
  )
}
