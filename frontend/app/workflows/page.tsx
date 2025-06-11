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
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-purple-50/30">
      <div className="container mx-auto max-w-7xl">
        {/* Modern Header Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSI0Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
          <div className="relative px-6 py-16">
            <div className="max-w-4xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                    <PlusCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                      Risk Workflows
                    </h1>
                    <p className="text-blue-100 text-lg font-medium max-w-2xl">
                      Manage and monitor your risk assessment workflows with
                      intelligent automation and comprehensive tracking
                    </p>
                  </div>
                </div>
                <Link href="/workflows/new">
                  <Button className="bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 hover:border-white/30 shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-2.5 rounded-lg font-semibold">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    New Assessment
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-100/50 shadow-lg mx-6 -mt-6 relative z-10 p-6">
          <WorkflowFilters initialStatus={searchParams.status} initialSearch={searchParams.search} />
        </div>

        {/* Workflows List */}
        <div className="p-6">
          <Suspense fallback={<LoadingWorkflows />}>
            <WorkflowList status={searchParams.status} search={searchParams.search} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
