import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import NewWorkflowForm from "@/components/new-workflow-form"

export default function NewWorkflowPage() {
  return (
    <main className="container mx-auto py-8 px-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>New Risk Assessment</CardTitle>
          <CardDescription>Start a new Risk and Control Self-Assessment workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <NewWorkflowForm />
        </CardContent>
      </Card>
    </main>
  )
}
