"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { getWorkflow, updateWorkflowContext } from "@/lib/api-client"
import { WorkflowContext } from "@/lib/types"
import WorkflowContextEditor from "@/components/workflow-context-editor"
import { useToast } from "@/hooks/use-toast"

export default function WorkflowEditPage() {
  const router = useRouter()
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const { toast } = useToast()
  const [context, setContext] = useState<WorkflowContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchContext() {
      if (!id) return
      try {
        const data = await getWorkflow(id)
        setContext(data)
      } catch (err: any) {
        setError("Failed to load workflow context.")
      } finally {
        setLoading(false)
      }
    }
    fetchContext()
  }, [id])

  const handleSave = async (updated: Partial<WorkflowContext>) => {
    setSaving(true)
    setError(null)
    try {
      if (!id) throw new Error("No workflow id")
      const updatedContext = await updateWorkflowContext(id, updated)
      setContext(updatedContext)
      toast({ title: "Workflow context updated!" })
      router.push(`/workflows/${id}`)
    } catch (err: any) {
      setError("Failed to update workflow context.")
      toast({ title: "Update failed", description: err.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div className="text-red-500">{error}</div>
  if (!context) return <div>Workflow context not found.</div>

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Edit Workflow Context</h1>
      <WorkflowContextEditor
        context={context}
        onSave={handleSave}
        saving={saving}
      />
      <div className="flex gap-4 mt-6">
        <button
          type="submit"
          className="px-6 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50"
          onClick={() => document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          className="px-6 py-2 rounded bg-black text-white font-medium hover:bg-neutral-800 transition disabled:opacity-50"
          onClick={() => router.push(`/workflows/${id}`)}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
