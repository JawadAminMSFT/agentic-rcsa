"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createWorkflow } from "@/lib/workflow-actions"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function NewWorkflowForm() {
  const router = useRouter()
  const [projectDescription, setProjectDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const workflowId = await createWorkflow(projectDescription)
      console.log("Created workflow with ID:", workflowId)
      router.push(`/workflows/${workflowId}`)
    } catch (err) {
      console.error("Error creating workflow:", err)
      setError(err instanceof Error ? err.message : "Failed to create workflow. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="project-description">Project Description</Label>
        <Textarea
          id="project-description"
          placeholder="Describe your project in detail..."
          rows={6}
          value={projectDescription}
          onChange={(e) => setProjectDescription(e.target.value)}
          required
          className="resize-none"
        />
        <p className="text-sm text-muted-foreground">
          Provide a comprehensive description of your project. This will be used to generate the initial draft and
          identify potential risks.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting || !projectDescription.trim()}>
        {isSubmitting ? "Creating..." : "Start Assessment"}
      </Button>
    </form>
  )
}
