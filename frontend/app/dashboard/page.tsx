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
    <div className="min-h-screen p-6">
      <div className="container mx-auto max-w-7xl space-y-8">
        {/* Header Section */}
        <div className="glass-card rounded-2xl p-8 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Risk Assessment Dashboard
              </h1>
              <p className="text-gray-600 text-lg">
                Comprehensive overview of your Risk and Control Self-Assessment workflows
              </p>
            </div>
            <Link href="/workflows/new">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-6 py-3 rounded-xl flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                New Assessment
              </Button>
            </Link>
          </div>
        </div>

        {/* Primary Stats Cards - Assessment Outcomes */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass-card rounded-2xl shadow-lg border-0 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-green-800">Approved</CardTitle>
                  <CardDescription className="text-green-700">Risk assessments approved</CardDescription>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-800">{approvedCount}</div>
            </CardContent>
            <CardFooter>
              <Link href="/workflows?status=approved">
                <Button variant="ghost" size="sm" className="flex items-center gap-2 text-green-800 hover:bg-green-100 rounded-xl transition-all">
                  <FileText className="h-4 w-4" />
                  View approved
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="glass-card rounded-2xl shadow-lg border-0 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-red-50 to-pink-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-red-800">Rejected</CardTitle>
                  <CardDescription className="text-red-700">Risk assessments rejected</CardDescription>
                </div>
                <div className="p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl">
                  <XCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-800">{rejectedCount}</div>
            </CardContent>
            <CardFooter>
              <Link href="/workflows?status=rejected">
                <Button variant="ghost" size="sm" className="flex items-center gap-2 text-red-800 hover:bg-red-100 rounded-xl transition-all">
                  <FileText className="h-4 w-4" />
                  View rejected
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="glass-card rounded-2xl shadow-lg border-0 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-amber-800">Awaiting Feedback</CardTitle>
                  <CardDescription className="text-amber-700">Require your input</CardDescription>
                </div>
                <div className="p-3 bg-gradient-to-r from-amber-400 to-orange-400 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-800">{awaitingFeedbackCount}</div>
            </CardContent>
            <CardFooter>
              <Link href="/workflows?status=awaiting_feedback">
                <Button variant="ghost" size="sm" className="flex items-center gap-2 text-amber-800 hover:bg-amber-100 rounded-xl transition-all">
                  <Clock className="h-4 w-4" />
                  View pending
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="glass-card rounded-2xl shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">In Progress</CardTitle>
                  <CardDescription className="text-gray-600">Currently being processed</CardDescription>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{activeCount}</div>
            </CardContent>
            <CardFooter>
              <Link href="/workflows?status=active">
                <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-blue-50 rounded-xl transition-all">
                  <FileText className="h-4 w-4" />
                  View active
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        {/* Secondary Stats Cards - Risk Intelligence */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass-card rounded-2xl shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Total Risks</CardTitle>
                  <CardDescription className="text-gray-600">Identified across all workflows</CardDescription>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl">
                  <Shield className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{totalRisks}</div>
            </CardContent>
          </Card>

          <Card className="glass-card rounded-2xl shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Critical Issues</CardTitle>
                  <CardDescription className="text-red-600">High severity issues flagged</CardDescription>
                </div>
                <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{criticalIssues}</div>
              <div className="text-sm text-gray-500 mt-1">of {totalIssues} total issues</div>
            </CardContent>
          </Card>

          <Card className="glass-card rounded-2xl shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Guardrail Violations</CardTitle>
                  <CardDescription className="text-gray-600">Compliance violations detected</CardDescription>
                </div>
                <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{guardrailViolations}</div>
            </CardContent>
          </Card>

          <Card className="glass-card rounded-2xl shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Mitigations</CardTitle>
                  <CardDescription className="text-gray-600">Proposed risk mitigations</CardDescription>
                </div>
                <div className="p-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{totalMitigations}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Workflows Section */}
        <div className="glass-card rounded-2xl p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
              Recent Workflows
            </h2>
            <Link href="/workflows">
              <Button variant="outline" className="rounded-xl border-gray-200 hover:bg-white/80 transition-all duration-300">
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
