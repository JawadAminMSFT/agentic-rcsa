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
  limit?: number
  status?: string
  search?: string
}

export default function WorkflowList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "in_progress">("all")
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
    <div className="min-h-screen p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header Section with Glass Card */}
        <div className="glass-card rounded-2xl p-8 mb-8 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Risk Workflows
              </h1>
              <p className="text-gray-600 text-lg">
                Manage and monitor your operational risk assessment workflows
              </p>
            </div>
          </div>
          
          {/* Search and Filter Section */}
          <div className="flex flex-col md:flex-row gap-4 mt-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400 bg-white/80 backdrop-blur-sm"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setFilterStatus(filterStatus === "all" ? "in_progress" : "all")}
              className="rounded-xl border-gray-200 hover:bg-white/80 transition-all duration-300"
            >
              <Filter className="w-4 h-4 mr-2" />
              {filterStatus === "all" ? "All Status" : "In Progress"}
            </Button>
          </div>
        </div>

        {/* Workflows Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredWorkflows.map((workflow) => (
            <Link key={workflow.id} href={`/workflows/${workflow.id}`}>
              <Card className="glass-card rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] cursor-pointer group border-0">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-300 line-clamp-2">
                        {workflow.title}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        ID: {workflow.id}
                      </p>
                    </div>
                    <StatusBadge status={workflow.status} />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {workflow.description || "No description available"}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
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
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
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
          <div className="glass-card rounded-2xl p-12 text-center shadow-lg">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No workflows found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterStatus !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Get started by creating your first risk assessment workflow"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status.toLowerCase()) {
    case "approved":
      return (
        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 rounded-full px-3 py-1 shadow-sm">
          Approved
        </Badge>
      )
    case "rejected":
      return (
        <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 rounded-full px-3 py-1 shadow-sm">
          Rejected
        </Badge>
      )
    case "awaiting_feedback":
      return (
        <Badge className="bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 rounded-full px-3 py-1 shadow-sm flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Feedback Needed
        </Badge>
      )
    default:
      return (
        <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 rounded-full px-3 py-1 shadow-sm">
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
