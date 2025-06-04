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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="container mx-auto max-w-7xl space-y-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                Risk Workflows
              </h1>
              <p className="text-gray-600 text-sm">
                Manage and monitor your risk assessment workflows
              </p>
            </div>
            <Link href="/workflows/new">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-4 py-2 rounded-md flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                New Assessment
              </Button>
            </Link>
          </div>

          <div className="mt-4">
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
