"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, CheckCircle, Info } from "lucide-react"

// Utility: safely parse JSON from a string that may contain extra text
function safeParse(data: any) {
  if (typeof data === "string") {
    const firstBrace = data.indexOf("{");
    const lastBrace = data.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(data.slice(firstBrace, lastBrace + 1));
      } catch {
        // fallback to original string if parse fails
      }
    }
    // Try array if not object
    const firstBracket = data.indexOf("[");
    const lastBracket = data.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(data.slice(firstBracket, lastBracket + 1));
      } catch {
        // fallback
      }
    }
  }
  return data;
}

interface StepContentProps {
  step: string
  data: any
}

export default function StepContent({ step, data }: StepContentProps) {
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted")

  // Handle different step types
  if (step === "generate_draft") {
    return <DraftSubmissionContent data={data} viewMode={viewMode} setViewMode={setViewMode} />
  }
  if (step === "map_risks") {
    return <RiskMappingContent data={data} viewMode={viewMode} setViewMode={setViewMode} />
  }
  if (step === "map_controls") {
    return <ControlMappingContent data={data} viewMode={viewMode} setViewMode={setViewMode} />
  }
  if (step === "generate_mitigations") {
    return <MitigationContent data={data} viewMode={viewMode} setViewMode={setViewMode} />
  }
  if (step === "flag_issues") {
    return <IssuesContent data={data} viewMode={viewMode} setViewMode={setViewMode} />
  }
  if (step === "evaluate_decision") {
    return <DecisionContent data={data} viewMode={viewMode} setViewMode={setViewMode} />
  }
  if (step.startsWith("guard_")) {
    return <GuardrailContent data={data} />
  }
  // Default view for any other step type
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {viewMode === "formatted" ? (
        <div className="prose max-w-none">
          <pre className="bg-muted p-4 rounded-md overflow-auto">
            {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
          </pre>
        </div>
      ) : (
        <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  )
}

function ViewModeToggle({
  viewMode,
  setViewMode,
}: {
  viewMode: "formatted" | "raw"
  setViewMode: (mode: "formatted" | "raw") => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">View:</span>
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
        <TabsList className="h-8">
          <TabsTrigger value="formatted" className="text-xs px-2 py-1">
            Formatted
          </TabsTrigger>
          <TabsTrigger value="raw" className="text-xs px-2 py-1">
            Raw JSON
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}

function DraftSubmissionContent({
  data,
  viewMode,
  setViewMode,
}: {
  data: any
  viewMode: "formatted" | "raw"
  setViewMode: (mode: "formatted" | "raw") => void
}) {
  const parsedData = safeParse(data)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {viewMode === "formatted" ? (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold">{parsedData.project_title}</h3>
            <p className="mt-2 text-muted-foreground">{parsedData.project_description}</p>
          </div>

          <div>
            <h4 className="text-md font-semibold mb-2">Objectives</h4>
            <ul className="list-disc pl-5 space-y-1">
              {(parsedData.objectives ?? []).map((obj: string, i: number) => (
                <li key={i}>{obj}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-md font-semibold mb-2">Benefits</h4>
            <ul className="list-disc pl-5 space-y-1">
              {(parsedData.benefits ?? []).map((benefit: string, i: number) => (
                <li key={i}>{benefit}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-md font-semibold mb-2">Deliverables</h4>
            <ul className="list-disc pl-5 space-y-1">
              {(parsedData.deliverables ?? []).map((deliverable: string, i: number) => (
                <li key={i}>{deliverable}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">{JSON.stringify(parsedData, null, 2)}</pre>
      )}
    </div>
  )
}

function RiskMappingContent({
  data,
  viewMode,
  setViewMode,
}: {
  data: any
  viewMode: "formatted" | "raw"
  setViewMode: (mode: "formatted" | "raw") => void
}) {
  const parsedData = safeParse(data)
  const risks = Array.isArray(parsedData) ? parsedData : []

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {viewMode === "formatted" ? (
        <div className="space-y-4">
          {risks.map((risk, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{risk.risk}</h4>
                    <Badge variant="outline" className="ml-2">
                      Confidence: {(risk.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge variant="secondary">{risk.category}</Badge>
                    {risk.subrisk && <Badge variant="outline">{risk.subrisk}</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">{JSON.stringify(parsedData, null, 2)}</pre>
      )}
    </div>
  )
}

function ControlMappingContent({
  data,
  viewMode,
  setViewMode,
}: {
  data: any
  viewMode: "formatted" | "raw"
  setViewMode: (mode: "formatted" | "raw") => void
}) {
  const parsedData = safeParse(data)
  const controlMappings = Array.isArray(parsedData) ? parsedData : []

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {viewMode === "formatted" ? (
        <div className="space-y-6">
          {controlMappings.map((mapping, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">{mapping.risk}</h4>
                <div className="space-y-2">
                  {mapping.controls.map((control: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div>
                        <span className="font-mono text-xs bg-primary/10 px-1.5 py-0.5 rounded">
                          {control.control_id}
                        </span>
                        <span className="ml-2">{control.name}</span>
                      </div>
                      <Badge variant="outline">Relevance: {(control.relevance_score * 100).toFixed(0)}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">{JSON.stringify(parsedData, null, 2)}</pre>
      )}
    </div>
  )
}

function MitigationContent({
  data,
  viewMode,
  setViewMode,
}: {
  data: any
  viewMode: "formatted" | "raw"
  setViewMode: (mode: "formatted" | "raw") => void
}) {
  const parsedData = safeParse(data)
  const mitigations = Array.isArray(parsedData) ? parsedData : []

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {viewMode === "formatted" ? (
        <div className="space-y-6">
          {mitigations.map((mitigation, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{mitigation.risk}</h4>
                  <Badge variant="outline">{mitigation.control_id}</Badge>
                </div>
                <div className="space-y-1">
                  <h5 className="text-sm font-medium mb-2">Mitigation Steps:</h5>
                  <ul className="list-disc pl-5 space-y-1">
                    {mitigation.mitigation_steps.map((step: string, i: number) => (
                      <li key={i} className="text-sm">
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">{JSON.stringify(parsedData, null, 2)}</pre>
      )}
    </div>
  )
}

function IssuesContent({
  data,
  viewMode,
  setViewMode,
}: {
  data: any
  viewMode: "formatted" | "raw"
  setViewMode: (mode: "formatted" | "raw") => void
}) {
  const parsedData = safeParse(data)
  // Support both root-level array and issues_list property
  const issues = Array.isArray(parsedData)
    ? parsedData
    : Array.isArray(parsedData?.issues_list)
      ? parsedData.issues_list
      : parsedData?.issues_list
        ? [parsedData.issues_list]
        : []

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {viewMode === "formatted" ? (
        <div className="space-y-4">
          {issues.map((issue: any, index: number) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">{getSeverityIcon(issue.severity)}</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{issue.issue}</h4>
                      <Badge variant={getSeverityVariant(issue.severity)} className="ml-2">
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="text-sm">{issue.recommendation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">{JSON.stringify(parsedData, null, 2)}</pre>
      )}
    </div>
  )
}

function DecisionContent({
  data,
  viewMode,
  setViewMode,
}: {
  data: any
  viewMode: "formatted" | "raw"
  setViewMode: (mode: "formatted" | "raw") => void
}) {
  const parsedData = safeParse(data)
  // Support both root-level and decision_result-wrapped decision objects
  const decisionObj = parsedData?.decision_result || parsedData

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {viewMode === "formatted" ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center mb-4">
              {decisionObj.decision?.toLowerCase() === "approved" ? (
                <>
                  <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                  <h3 className="text-xl font-bold text-green-500">Approved</h3>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-12 w-12 text-destructive mb-2" />
                  <h3 className="text-xl font-bold text-destructive">Rejected</h3>
                </>
              )}
            </div>

            <div className="mt-4">
              <h4 className="text-md font-semibold mb-2">Rationale</h4>
              <p>{decisionObj.rationale}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">{JSON.stringify(parsedData, null, 2)}</pre>
      )}
    </div>
  )
}

function GuardrailContent({ data }: { data: any }) {
  const parsedData = safeParse(data)
  const violations = Array.isArray(parsedData) ? parsedData : []

  if (violations.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div>
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <h3 className="text-lg font-medium">No Guardrail Violations</h3>
          <p className="text-muted-foreground mt-1">All guardrail checks passed successfully</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-amber-800">Guardrail Violations Detected</h4>
          <p className="text-sm text-amber-700 mt-1">
            The following guardrail rules were violated and need to be addressed
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {violations.map((violation: any, index: number) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">{getSeverityIcon(violation.severity)}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{violation.issue || violation.description}</h4>
                    <Badge variant={getSeverityVariant(violation.severity)} className="ml-2">
                      {violation.severity}
                    </Badge>
                  </div>
                  <p className="text-sm mt-1">{violation.recommendation}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function getSeverityIcon(severity: string) {
  switch (severity?.toLowerCase()) {
    case "high":
      return <AlertTriangle className="h-5 w-5 text-destructive" />
    case "medium":
      return <AlertTriangle className="h-5 w-5 text-amber-500" />
    case "low":
      return <Info className="h-5 w-5 text-blue-500" />
    default:
      return <Info className="h-5 w-5 text-muted-foreground" />
  }
}

function getSeverityVariant(severity: string): "destructive" | "outline" | "secondary" {
  switch (severity?.toLowerCase()) {
    case "high":
      return "destructive"
    case "medium":
      return "secondary"
    default:
      return "outline"
  }
}
