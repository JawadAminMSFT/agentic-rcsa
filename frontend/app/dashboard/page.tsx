import React, { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, FileText, Clock, TrendingUp, CheckCircle, AlertCircle, Shield, AlertTriangle, XCircle } from "lucide-react"
import WorkflowList from "@/components/workflow-list"
import LoadingWorkflows from "@/components/loading-workflows"
import { getWorkflows } from "@/lib/workflow-service"
import { getWorkflow } from "@/lib/api-client"

export default async function DashboardPage() {
  // Get detailed workflow data for dashboard metrics
  let approvedCount = 0
  let rejectedCount = 0
  let awaitingFeedbackCount = 0
  let activeCount = 0
  let totalRisks = 0
  let totalIssues = 0
  let criticalIssues = 0
  let guardrailViolations = 0
  let totalMitigations = 0

  try {
    const allWorkflows = await getWorkflows({})

    // Calculate basic status counts
    approvedCount = allWorkflows.filter((w) => w.status === "approved").length
    rejectedCount = allWorkflows.filter((w) => w.status === "rejected").length
    awaitingFeedbackCount = allWorkflows.filter((w) => w.status === "awaiting_feedback").length
    activeCount = allWorkflows.filter((w) => w.status === "active").length

    // Get detailed data from workflow contexts for rich metrics
    const detailedWorkflows = await Promise.all(
      allWorkflows.slice(0, 20).map(async (workflow) => {
        try {
          const context = await getWorkflow(workflow.id)
          return context
        } catch (error) {
          console.error(`Error fetching workflow ${workflow.id}:`, error)
          return null
        }
      })
    )

    // Calculate rich metrics from workflow contexts
    detailedWorkflows.forEach((context) => {
      if (!context) return

      // Count risks
      if (context.risk_mapping && Array.isArray(context.risk_mapping)) {
        totalRisks += context.risk_mapping.length
      }

      // Count issues and critical issues
      if (context.issues_list && Array.isArray(context.issues_list)) {
        totalIssues += context.issues_list.length
        criticalIssues += context.issues_list.filter((issue: any) => 
          issue.severity?.toLowerCase() === "high" || issue.severity?.toLowerCase() === "critical"
        ).length
      }

      // Count guardrail violations
      if (context.guardrail_violations && typeof context.guardrail_violations === 'object') {
        Object.values(context.guardrail_violations).forEach((violations: any) => {
          if (Array.isArray(violations)) {
            guardrailViolations += violations.length
          }
        })
      }

      // Count mitigations
      if (context.mitigation_proposals && Array.isArray(context.mitigation_proposals)) {
        totalMitigations += context.mitigation_proposals.length
      }
    })

  } catch (error) {
    console.error("Error fetching workflow data:", error)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="container mx-auto max-w-7xl space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                Risk Assessment Dashboard
              </h1>
              <p className="text-gray-600 text-sm">
                Overview of your Risk and Control Self-Assessment workflows
              </p>
            </div>
            <Link href="/workflows/new">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-4 py-2 rounded-md flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                New Assessment
              </Button>
            </Link>
          </div>
        </div>

        {/* Primary Stats Cards - Assessment Outcomes */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium text-gray-700">Approved</CardTitle>
                  <CardDescription className="text-xs text-gray-500">Risk assessments approved</CardDescription>
                </div>
                <div className="p-2 bg-green-50 rounded-md">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900">{approvedCount}</div>
            </CardContent>
            <CardFooter>
              <Link href="/workflows?status=approved">
                <Button variant="ghost" size="sm" className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-all h-8 px-3 text-xs">
                  <FileText className="h-3 w-3" />
                  View approved
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium text-gray-700">Rejected</CardTitle>
                  <CardDescription className="text-xs text-gray-500">Risk assessments rejected</CardDescription>
                </div>
                <div className="p-2 bg-red-50 rounded-md">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900">{rejectedCount}</div>
            </CardContent>
            <CardFooter>
              <Link href="/workflows?status=rejected">
                <Button variant="ghost" size="sm" className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-all h-8 px-3 text-xs">
                  <FileText className="h-3 w-3" />
                  View rejected
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium text-gray-700">Awaiting Feedback</CardTitle>
                  <CardDescription className="text-xs text-gray-500">Require your input</CardDescription>
                </div>
                <div className="p-2 bg-amber-50 rounded-md">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900">{awaitingFeedbackCount}</div>
            </CardContent>
            <CardFooter>
              <Link href="/workflows?status=awaiting_feedback">
                <Button variant="ghost" size="sm" className="flex items-center gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-all h-8 px-3 text-xs">
                  <Clock className="h-3 w-3" />
                  View pending
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium text-gray-700">In Progress</CardTitle>
                  <CardDescription className="text-xs text-gray-500">Currently being processed</CardDescription>
                </div>
                <div className="p-2 bg-blue-50 rounded-md">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900">{activeCount}</div>
            </CardContent>
            <CardFooter>
              <Link href="/workflows?status=active">
                <Button variant="ghost" size="sm" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-all h-8 px-3 text-xs">
                  <FileText className="h-3 w-3" />
                  View active
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        {/* Secondary Stats Cards - Risk Intelligence */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium text-gray-700">Total Risks</CardTitle>
                  <CardDescription className="text-xs text-gray-500">Identified across all workflows</CardDescription>
                </div>
                <div className="p-2 bg-purple-50 rounded-md">
                  <Shield className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900">{totalRisks}</div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium text-gray-700">Critical Issues</CardTitle>
                  <CardDescription className="text-xs text-gray-500">High severity issues flagged</CardDescription>
                </div>
                <div className="p-2 bg-orange-50 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900">{criticalIssues}</div>
              <div className="text-xs text-gray-500 mt-1">of {totalIssues} total issues</div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium text-gray-700">Guardrail Violations</CardTitle>
                  <CardDescription className="text-xs text-gray-500">Compliance violations detected</CardDescription>
                </div>
                <div className="p-2 bg-yellow-50 rounded-md">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900">{guardrailViolations}</div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium text-gray-700">Mitigations</CardTitle>
                  <CardDescription className="text-xs text-gray-500">Proposed risk mitigations</CardDescription>
                </div>
                <div className="p-2 bg-cyan-50 rounded-md">
                  <CheckCircle className="h-4 w-4 text-cyan-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900">{totalMitigations}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Workflows Section */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Workflows
            </h2>
            <Link href="/workflows">
              <Button variant="outline" className="rounded-md border-gray-300 hover:bg-gray-50 text-gray-700 text-sm px-3 py-2">
                View All Workflows
              </Button>
            </Link>
          </div>
          
          <Suspense fallback={<LoadingWorkflows />}>
            <WorkflowList />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
