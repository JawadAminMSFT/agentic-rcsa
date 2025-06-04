"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { getWorkflow, updateWorkflowContext } from "@/lib/api-client"
import { WorkflowContext } from "@/lib/types"
import WorkflowContextEditor from "@/components/workflow-context-editor"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, X } from "lucide-react"
import Link from "next/link"

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

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="container mx-auto max-w-4xl">
          <div className="glass-card rounded-2xl p-8 shadow-xl">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <div className="container mx-auto max-w-4xl">
          <div className="glass-card rounded-2xl p-8 shadow-xl">
            <div className="text-center space-y-4">
              <div className="text-red-500 text-lg font-medium">{error}</div>
              <Link href={`/workflows/${id}`}>
                <Button variant="outline" className="rounded-xl">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Workflow
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!context) {
    return (
      <div className="min-h-screen p-6">
        <div className="container mx-auto max-w-4xl">
          <div className="glass-card rounded-2xl p-8 shadow-xl">
            <div className="text-center space-y-4">
              <div className="text-gray-500 text-lg">Workflow context not found.</div>
              <Link href="/workflows">
                <Button variant="outline" className="rounded-xl">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Workflows
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="glass-card rounded-2xl p-8 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Edit Workflow Context
              </h1>
              <p className="text-gray-600">
                Modify workflow details and parameters
              </p>
            </div>
            <Link href={`/workflows/${id}`}>
              <Button variant="outline" className="rounded-xl border-gray-200 hover:bg-white/80 transition-all duration-300">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Workflow
              </Button>
            </Link>
          </div>
        </div>

        {/* Editor */}
        <div className="glass-card rounded-2xl p-8 shadow-xl">
          <WorkflowContextEditor
            context={context}
            onSave={handleSave}
            saving={saving}
          />
          
          {/* Action Buttons */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              onClick={() => document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
              disabled={saving}
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
            
            <button
              type="button"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
              onClick={() => router.push(`/workflows/${id}`)}
              disabled={saving}
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
