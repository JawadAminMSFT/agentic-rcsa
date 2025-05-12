"use client"

import { CheckCircle, Circle, AlertCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface WorkflowProgressProps {
  steps: Array<{ step: string; output: any }>
  currentStep: string | null
  workflowStatus: string
  onStepClick?: (step: string) => void
}

export default function WorkflowProgress({ steps, currentStep, workflowStatus, onStepClick }: WorkflowProgressProps) {
  // Filter out guard steps for the main progress display
  const mainSteps = steps.filter((s) => !s.step.startsWith("guard_"))

  // Define the expected workflow steps in order
  const workflowSteps = [
    "generate_draft",
    "map_risks",
    "map_controls",
    "generate_mitigations",
    "flag_issues",
    "evaluate_decision",
  ]

  // Get the completed steps
  const completedSteps = new Set(mainSteps.map((s) => s.step))

  // Check if the workflow is rejected (handle both possible structures)
  const isRejected = mainSteps.some(
    (s) =>
      s.step === "evaluate_decision" &&
      (s.output?.decision_result?.decision === "Rejected" ||
        s.output?.decision === "Rejected")
  )

  return (
    <div className="space-y-1">
      <ol className="space-y-4">
        {workflowSteps.map((step, index) => {
          const isCompleted = completedSteps.has(step)
          const isCurrent = step === currentStep
          const isAwaitingFeedback = isCurrent && workflowStatus === "awaiting_feedback"

          return (
            <li
              key={step}
              className={cn(
                "flex items-start gap-3 cursor-pointer",
                isCurrent && "font-medium",
                isAwaitingFeedback && "text-amber-700",
              )}
              onClick={() => {
                if ((isCompleted || isCurrent) && onStepClick) {
                  onStepClick(step)
                }
              }}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isCompleted ? (
                  step === "evaluate_decision" && isRejected ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )
                ) : isCurrent ? (
                  isAwaitingFeedback ? (
                    <Clock className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-primary" />
                  )
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <div
                  className={cn(
                    "text-sm",
                    !isCompleted && !isCurrent && "text-muted-foreground",
                    isAwaitingFeedback && "text-amber-700",
                  )}
                >
                  {formatStepName(step)}
                </div>
                {isCompleted && step === "evaluate_decision" && (
                  <div className={cn("text-xs mt-1", isRejected ? "text-destructive" : "text-green-500")}>
                    {isRejected ? "Rejected" : "Approved"}
                  </div>
                )}
                {isAwaitingFeedback && <div className="text-xs mt-1 text-amber-600">Awaiting feedback</div>}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function formatStepName(step: string): string {
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
