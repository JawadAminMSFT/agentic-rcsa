"use client"

import { useState, useEffect } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, RefreshCw, CheckCircle } from "lucide-react"
import type { WorkflowContext } from "@/lib/types"
import { submitFeedback } from "@/lib/workflow-actions"
import { getWorkflow } from "@/lib/api-client"
import StepContent from "@/components/step-content"
import WorkflowProgress from "@/components/workflow-progress"
import AgentStatusDisplay from "@/components/agent-status-display"
import AgentTransition from "@/components/agent-transition"
import { useAgentStatus } from "@/hooks/use-agent-status"

interface WorkflowStepsProps {
  workflowContext: WorkflowContext
  workflowId: string
}

export default function WorkflowSteps({ workflowContext: initialContext, workflowId }: WorkflowStepsProps) {
  const [workflowContext, setWorkflowContext] = useState<WorkflowContext>(initialContext)
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<Record<string, string>>({})
  const [expandedStep, setExpandedStep] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null)

  // Poll for workflow updates
  useEffect(() => {
    let intervalId: NodeJS.Timeout

    const pollWorkflow = async () => {
      try {
        const updatedContext = await getWorkflow(workflowId)
        setWorkflowContext(updatedContext)
        setLastPollTime(new Date())

        // If workflow is completed, stop polling
        if (updatedContext.status === "completed") {
          setIsPolling(false)
          clearInterval(intervalId)
        }
      } catch (error) {
        console.error("Error polling workflow:", error)
      }
    }

    // Start polling if workflow is in progress or awaiting feedback
    if (workflowContext.status !== "completed") {
      setIsPolling(true)
      intervalId = setInterval(pollWorkflow, 5000) // Poll every 5 seconds

      // Initial poll
      pollWorkflow()
    }

    return () => {
      clearInterval(intervalId)
    }
  }, [workflowId])

  const handleSubmitFeedback = async (step: string) => {
    if (!feedback[step]?.trim()) return

    setSubmitting({ ...submitting, [step]: true })
    setError({ ...error, [step]: "" })

    try {
      await submitFeedback(workflowId, step, feedback[step])
      setFeedback({ ...feedback, [step]: "" })

      // Immediately poll for updates after submitting feedback
      try {
        const updatedContext = await getWorkflow(workflowId)
        setWorkflowContext(updatedContext)
        setLastPollTime(new Date())
      } catch (pollError) {
        console.error("Error polling after feedback:", pollError)
      }
    } catch (err) {
      console.error("Failed to submit feedback:", err)
      setError({
        ...error,
        [step]: err instanceof Error ? err.message : "Failed to submit feedback. Please try again.",
      })
    } finally {
      setSubmitting({ ...submitting, [step]: false })
    }
  }

  const steps = workflowContext.ui_updates || []
  const currentStep = workflowContext.current_step || (steps.length > 0 ? steps[steps.length - 1].step : null)

  // Determine which agent should be shown as working
  // If current_step already has output, the agent is working on the next step
  const hasCurrentStepOutput = currentStep ? steps.some(step => step.step === currentStep) : false
  
  // Define the workflow step order
  const workflowStepOrder = [
    "generate_draft",
    "map_risks", 
    "map_controls",
    "generate_mitigations",
    "flag_issues",
    "evaluate_decision"
  ];
  
  // Determine which step agent is actually working on
  let agentWorkingStep: string | null = null;
  
  if (currentStep && hasCurrentStepOutput) {
    // Current step is complete, agent is working on next step
    const currentIndex = workflowStepOrder.indexOf(currentStep);
    if (currentIndex >= 0 && currentIndex < workflowStepOrder.length - 1) {
      agentWorkingStep = workflowStepOrder[currentIndex + 1];
    }
  } else if (currentStep && !hasCurrentStepOutput) {
    // Current step doesn't have output yet, agent is working on current step
    agentWorkingStep = currentStep;
  }
  
  // Show agent status when there's a working step and workflow is active
  const shouldShowAgentStatus = agentWorkingStep && 
    workflowContext.status !== "awaiting_feedback"
  
  // Use agent status hook to show progress messages
  const agentStatus = useAgentStatus(
    shouldShowAgentStatus ? agentWorkingStep : null,
    false, // Always cycle through messages for better UX
    workflowContext.status
  )

  // Automatically expand the current step if awaiting feedback
  useEffect(() => {
    if (workflowContext.status === "awaiting_feedback" && currentStep) {
      setExpandedStep(currentStep)
    }
  }, [workflowContext.status, currentStep])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Enhanced Progress Sidebar */}
      <div className="lg:col-span-1">
        <div className="sticky top-6">
          {/* Progress Header */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Progress</h3>
              {isPolling && (
                <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Live updates
                </div>
              )}
            </div>

            {/* Workflow Status Badge */}
            <div className="mb-4">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                workflowContext.status === 'completed' ? 'bg-green-100 text-green-800' :
                workflowContext.status === 'awaiting_feedback' ? 'bg-amber-100 text-amber-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {workflowContext.status === 'completed' ? '✓ Completed' :
                 workflowContext.status === 'awaiting_feedback' ? '⏳ Awaiting Feedback' :
                 '🔄 In Progress'}
              </div>
            </div>

            <WorkflowProgress
              steps={steps}
              currentStep={currentStep}
              workflowStatus={workflowContext.status}
              onStepClick={(step) => setExpandedStep(step)}
            />

            {lastPollTime && (
              <div className="text-xs text-muted-foreground mt-4 pt-4 border-t border-gray-100">
                Last updated: {lastPollTime.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Summary</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Completed Steps:</span>
                <span className="font-medium">{steps.length}/6</span>
              </div>
              {workflowContext.risk_mapping?.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Risks Identified:</span>
                  <span className="font-medium">{workflowContext.risk_mapping.length}</span>
                </div>
              )}
              {workflowContext.controls_mapping?.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Controls Mapped:</span>
                  <span className="font-medium">{workflowContext.controls_mapping.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-3">
        {workflowContext.status === "awaiting_feedback" && (
          <Alert className="mb-4 bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-800">Feedback Required</AlertTitle>
            <AlertDescription className="text-amber-700">
              This workflow is waiting for your feedback on the "{formatStepName(currentStep || "")}" step.
            </AlertDescription>
          </Alert>
        )}

        {/* Agent Status Display */}
        <AgentStatusDisplay agentStatus={agentStatus} />

        <Accordion
          type="single"
          collapsible
          value={expandedStep || currentStep || undefined}
          onValueChange={setExpandedStep}
          className="space-y-6"
        >
          {steps.map((update, index) => (
            <div key={`step-container-${update.step}-${index}`}>
              <AccordionItem
                key={`${update.step}-${index}`}
                value={update.step}
                className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <AccordionTrigger className="px-6 py-4 hover:bg-gray-50/50 data-[state=open]:bg-gray-50">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                      <span className="font-semibold text-gray-900">{formatStepName(update.step)}</span>
                    </div>
                    {workflowContext.status === "awaiting_feedback" && update.step === currentStep && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-medium">
                        Feedback Needed
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 py-4 bg-gray-50/30">
                <StepContent step={update.step} data={update.output} />

                {!update.step.startsWith("guard_") && (
                  <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Provide Feedback</h4>
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Share your thoughts on this step..."
                        value={feedback[update.step] || ""}
                        onChange={(e) =>
                          setFeedback({
                            ...feedback,
                            [update.step]: e.target.value,
                          })
                        }
                        className="resize-none min-h-[100px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />

                      {error[update.step] && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{error[update.step]}</AlertDescription>
                        </Alert>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          Your feedback helps improve the workflow quality
                        </span>
                        <Button
                          onClick={() => handleSubmitFeedback(update.step)}
                          disabled={!feedback[update.step]?.trim() || submitting[update.step]}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                        >
                          {submitting[update.step] ? "Submitting..." : "Submit Feedback"}
                        </Button>
                      </div>

                      {workflowContext.feedbacks?.[update.step] && (
                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h5 className="text-sm font-semibold text-blue-900 mb-2">Previous Feedback</h5>
                          <p className="text-sm text-blue-800">{workflowContext.feedbacks[update.step]}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
            
            {/* Show transition to next step if there is one */}
            {index < steps.length - 1 && (
              <AgentTransition 
                fromStep={update.step}
                toStep={steps[index + 1].step}
              />
            )}
            </div>
          ))}
        </Accordion>
      </div>
    </div>
  )
}

function formatStepName(step: string): string {
  if (step.startsWith("guard_")) {
    return `Guardrail: ${formatStepName(step.replace("guard_", ""))}`
  }

  const stepMap: Record<string, string> = {
    generate_draft: "Draft Submission",
    map_risks: "Risk Mapping",
    map_controls: "Control Mapping",
    generate_mitigations: "Mitigation Proposals",
    flag_issues: "Issues & Deficiencies",
    evaluate_decision: "Final Decision",
  }

  return stepMap[step] || step.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}
