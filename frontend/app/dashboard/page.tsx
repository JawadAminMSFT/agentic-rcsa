import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, FileText, Clock } from "lucide-react"
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
    <main className="container mx-auto py-8 px-4">
      <div className="flex flex-col gap-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Workflow Dashboard</h1>
              <p className="text-muted-foreground">
                Manage and monitor your Risk and Control Self-Assessment workflows
              </p>
            </div>
            <Link href="/workflows/new">
              <Button className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                New Assessment
              </Button>
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Active Workflows</CardTitle>
              <CardDescription>Currently in progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeCount}</div>
            </CardContent>
            <CardFooter>
              <Link href="/workflows?status=active">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  View all
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Completed</CardTitle>
              <CardDescription>Finalized assessments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completedCount}</div>
            </CardContent>
            <CardFooter>
              <Link href="/workflows?status=completed">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  View all
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-amber-800">Awaiting Feedback</CardTitle>
              <CardDescription className="text-amber-700">Require your input</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-800">{awaitingFeedbackCount}</div>
            </CardContent>
            <CardFooter>
              <Link href="/workflows?status=awaiting_feedback">
                <Button variant="ghost" size="sm" className="flex items-center gap-2 text-amber-800">
                  <Clock className="h-4 w-4" />
                  View all
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        <section>
          <h2 className="text-xl font-semibold mb-4">Recent Workflows</h2>
          <Suspense fallback={<LoadingWorkflows />}>
            <WorkflowList limit={5} />
          </Suspense>
        </section>
      </div>
    </main>
  )
}
