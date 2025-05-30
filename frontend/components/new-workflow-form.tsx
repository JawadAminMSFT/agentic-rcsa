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
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import ConversationalIntake from "@/components/conversational-intake"

export default function NewWorkflowForm() {
  const router = useRouter()
  const [projectDescription, setProjectDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [tab, setTab] = useState("form")
  const [draft, setDraft] = useState<{ projectDescription: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const workflowId = await createWorkflow(projectDescription, file)
      console.log("Created workflow with ID:", workflowId)
      router.push(`/workflows/${workflowId}`)
    } catch (err) {
      console.error("Error creating workflow:", err)
      setError(err instanceof Error ? err.message : "Failed to create workflow. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="w-full mb-4">
        <TabsTrigger value="form" className="flex-1">Form Intake</TabsTrigger>
        <TabsTrigger value="ai" className="flex-1">Conversational Intake (AI)</TabsTrigger>
      </TabsList>
      <TabsContent value="form">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="project-description">Project Description</Label>
            <Textarea
              id="project-description"
              placeholder="Describe your project in detail..."
              rows={6}
              value={draft?.projectDescription ?? projectDescription}
              onChange={(e) => {
                setProjectDescription(e.target.value)
                if (draft) setDraft(null)
              }}
              required
              className="resize-none"
            />
            <div className="mt-4">
              <Label className="block mb-1">Attach File (optional)</Label>
              <label
                htmlFor="project-file"
                className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary transition"
              >
                <span className="text-sm text-gray-600">
                  {file ? file.name : "Click to select or drag a file here"}
                </span>
                <Input
                  id="project-file"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
              </label>
              {file && (
                <div className="flex items-center mt-2">
                  <span className="text-xs text-gray-500 mr-2">{file.name}</span>
                  <button
                    type="button"
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => setFile(null)}
                  >
                    Remove
                  </button>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Optionally upload a file (PDF, DOC, DOCX, TXT) to include more details.
              </p>
            </div>
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
      </TabsContent>
      <TabsContent value="ai">
        <ConversationalIntake />
      </TabsContent>
    </Tabs>
  )
}
