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
    <main className="container mx-auto py-8 px-4">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Workflows</h1>
            <p className="text-muted-foreground">Manage and monitor your risk assessment workflows</p>
          </div>
          <Link href="/workflows/new">
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              New Assessment
            </Button>
          </Link>
        </div>

        <WorkflowFilters initialStatus={searchParams.status} initialSearch={searchParams.search} />

        <Suspense fallback={<LoadingWorkflows />}>
          <WorkflowList status={searchParams.status} search={searchParams.search} />
        </Suspense>
      </div>
    </main>
  )
}
