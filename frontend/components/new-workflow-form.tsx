"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createWorkflow } from "@/lib/workflow-actions"
import { AlertCircle, FileText, Upload, X, Bot, MessageSquare, Video } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import ConversationalIntake from "@/components/conversational-intake"
import InterviewAgent from "@/components/interview-agent"

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Start New Risk Assessment</h1>
          <p className="text-gray-600">Choose your preferred method to begin the assessment process</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/60 backdrop-blur-sm rounded-2xl p-1 border border-white/20">
              <TabsTrigger 
                value="form" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg rounded-xl py-3 px-6 font-medium transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                Form Intake
              </TabsTrigger>
              <TabsTrigger 
                value="ai" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg rounded-xl py-3 px-6 font-medium transition-all"
              >
                <Bot className="w-4 h-4" />
                AI Conversation
              </TabsTrigger>
              <TabsTrigger 
                value="avatar" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg rounded-xl py-3 px-6 font-medium transition-all"
              >
                <Video className="w-4 h-4" />
                Interview Agent
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="form" className="mt-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
                <div className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Project Description Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <Label htmlFor="project-description" className="text-lg font-semibold text-gray-900">
                          Project Description
                        </Label>
                      </div>
                      
                      <div className="relative">
                        <Textarea
                          id="project-description"
                          placeholder="Describe your project in detail... Include objectives, scope, technology stack, stakeholders, and any specific concerns you'd like assessed."
                          rows={8}
                          value={draft?.projectDescription ?? projectDescription}
                          onChange={(e) => {
                            setProjectDescription(e.target.value)
                            if (draft) setDraft(null)
                          }}
                          required
                          className="resize-none border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 rounded-2xl p-4 text-gray-900 placeholder-gray-500 transition-all"
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                          {(draft?.projectDescription ?? projectDescription).length} characters
                        </div>
                      </div>
                    </div>

                    {/* File Upload Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Upload className="w-5 h-5 text-blue-600" />
                        <Label className="text-lg font-semibold text-gray-900">
                          Supporting Documents
                        </Label>
                        <span className="text-sm text-gray-500 font-normal">(Optional)</span>
                      </div>
                      
                      {!file ? (
                        <label
                          htmlFor="project-file"
                          className="flex flex-col items-center justify-center px-6 py-8 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                        >
                          <Upload className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mb-3" />
                          <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600 mb-1">
                            Click to upload or drag files here
                          </span>
                          <span className="text-xs text-gray-400">
                            PDF, DOC, DOCX, TXT files supported
                          </span>
                          <Input
                            id="project-file"
                            type="file"
                            accept=".pdf,.doc,.docx,.txt"
                            className="hidden"
                            onChange={e => setFile(e.target.files?.[0] || null)}
                          />
                        </label>
                      ) : (
                        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                            onClick={() => setFile(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Error Alert */}
                    {error && (
                      <Alert variant="destructive" className="border-red-200 bg-red-50 rounded-2xl">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {/* Submit Button */}
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-4 rounded-2xl font-medium shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100" 
                      disabled={isSubmitting || !projectDescription.trim()}
                      size="lg"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Creating Assessment...
                        </>
                      ) : (
                        "Start Risk Assessment"
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="ai" className="mt-8">
              <ConversationalIntake />
            </TabsContent>
            
            <TabsContent value="avatar" className="mt-8">
              <InterviewAgent />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
