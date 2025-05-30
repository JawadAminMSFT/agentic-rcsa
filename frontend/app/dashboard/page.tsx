import React, { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, FileText, Clock, TrendingUp, CheckCircle, AlertCircle } from "lucide-react"
import WorkflowList from "@/components/workflow-list"
import LoadingWorkflows from "@/components/loading-workflows"
import { getWorkflows } from "@/lib/workflow-service"

export default async function DashboardPage() {
  // Get counts for dashboard cards
  let activeCount = 0
  let completedCount = 0
  let awaitingFeedbackCount = 0

  try {
    const allWorkflows = await getWorkflows({})

    activeCount = allWorkflows.filter((w) => w.status === "active").length
    completedCount = allWorkflows.filter((w) => w.status === "approved" || w.status === "rejected").length
    awaitingFeedbackCount = allWorkflows.filter((w) => w.status === "awaiting_feedback").length
  } catch (error) {
    console.error("Error fetching workflow counts:", error)
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
                Manage and monitor your Risk and Control Self-Assessment workflows
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card rounded-2xl shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Active Workflows</CardTitle>
                  <CardDescription className="text-gray-600">Currently in progress</CardDescription>
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
                  View all
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="glass-card rounded-2xl shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Completed</CardTitle>
                  <CardDescription className="text-gray-600">Finalized assessments</CardDescription>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{completedCount}</div>
            </CardContent>
            <CardFooter>
              <Link href="/workflows?status=completed">
                <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-green-50 rounded-xl transition-all">
                  <FileText className="h-4 w-4" />
                  View all
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
                  View all
                </Button>
              </Link>
            </CardFooter>
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
