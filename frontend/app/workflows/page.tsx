import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import WorkflowList from "@/components/workflow-list"
import LoadingWorkflows from "@/components/loading-workflows"
import WorkflowFilters from "@/components/workflow-filters"

export default function WorkflowsPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string }
}) {
  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto max-w-7xl">
        <div className="glass-card rounded-2xl p-8 mb-8 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Risk Workflows
              </h1>
              <p className="text-gray-600 text-lg">
                Manage and monitor your risk assessment workflows
              </p>
            </div>
            <Link href="/workflows/new">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-6 py-3 rounded-xl flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                New Assessment
              </Button>
            </Link>
          </div>

          <div className="mt-6">
            <WorkflowFilters initialStatus={searchParams.status} initialSearch={searchParams.search} />
          </div>
        </div>

        <Suspense fallback={<LoadingWorkflows />}>
          <WorkflowList status={searchParams.status} search={searchParams.search} />
        </Suspense>
      </div>
    </div>
  )
}
