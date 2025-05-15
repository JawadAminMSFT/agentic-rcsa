import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { WorkflowContext } from "@/lib/types"

interface Props {
  context: WorkflowContext
  onSave: (updated: Partial<WorkflowContext>) => void
  saving?: boolean
}

export default function WorkflowContextEditor({ context, onSave, saving }: Props) {
  const [form, setForm] = useState<Partial<WorkflowContext>>({ ...context })

  // Draft Submission fields
  const draft = form.draft_submission || {}
  const [objectives, setObjectives] = useState<string[]>(draft.objectives || [])

  // Risk Mapping fields
  const [risks, setRisks] = useState<any[]>(form.risk_mapping || [])

  // Controls Mapping fields
  const [controls, setControls] = useState<any[]>(form.controls_mapping || [])

  // Mitigation Proposals fields
  const [mitigations, setMitigations] = useState<any[]>(form.mitigation_proposals || [])

  // Issues List fields
  const [issues, setIssues] = useState<any[]>(form.issues_list || [])

  // Decision Result fields
  const decision = form.decision_result || {}

  // Guardrail Violations fields
  const [violations, setViolations] = useState<any>(form.guardrail_violations || {})

  // Feedbacks fields
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>(form.feedbacks || {})

  // Handle field changes
  const handleChange = (field: keyof WorkflowContext, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Draft Submission handlers
  const handleDraftChange = (field: string, value: any) => {
    const updated = { ...draft, [field]: value }
    setForm((prev) => ({ ...prev, draft_submission: updated }))
  }

  const handleObjectiveChange = (idx: number, value: string) => {
    const updated = [...objectives]
    updated[idx] = value
    setObjectives(updated)
    handleDraftChange("objectives", updated)
  }

  const addObjective = () => {
    const updated = [...objectives, ""]
    setObjectives(updated)
    handleDraftChange("objectives", updated)
  }

  const removeObjective = (idx: number) => {
    const updated = objectives.filter((_, i) => i !== idx)
    setObjectives(updated)
    handleDraftChange("objectives", updated)
  }

  // Risk Mapping handlers
  const handleRiskChange = (idx: number, field: string, value: any) => {
    const updated = risks.map((r, i) =>
      i === idx ? { ...r, [field]: value } : r
    )
    setRisks(updated)
    handleChange("risk_mapping", updated)
  }

  const addRisk = () => {
    const updated = [...risks, { risk: "", category: "", confidence: 0 }]
    setRisks(updated)
    handleChange("risk_mapping", updated)
  }

  const removeRisk = (idx: number) => {
    const updated = risks.filter((_, i) => i !== idx)
    setRisks(updated)
    handleChange("risk_mapping", updated)
  }

  // Controls Mapping handlers
  const handleControlChange = (idx: number, field: string, value: any) => {
    const updated = controls.map((c, i) =>
      i === idx ? { ...c, [field]: value } : c
    )
    setControls(updated)
    handleChange("controls_mapping", updated)
  }
  const addControl = () => {
    const updated = [...controls, { risk: "", controls: [] }]
    setControls(updated)
    handleChange("controls_mapping", updated)
  }
  const removeControl = (idx: number) => {
    const updated = controls.filter((_, i) => i !== idx)
    setControls(updated)
    handleChange("controls_mapping", updated)
  }

  // Mitigation Proposals handlers
  const handleMitigationChange = (idx: number, field: string, value: any) => {
    const updated = mitigations.map((m, i) =>
      i === idx ? { ...m, [field]: value } : m
    )
    setMitigations(updated)
    handleChange("mitigation_proposals", updated)
  }
  const addMitigation = () => {
    const updated = [...mitigations, { risk: "", control_id: "", mitigation_steps: "" }]
    setMitigations(updated)
    handleChange("mitigation_proposals", updated)
  }
  const removeMitigation = (idx: number) => {
    const updated = mitigations.filter((_, i) => i !== idx)
    setMitigations(updated)
    handleChange("mitigation_proposals", updated)
  }

  // Issues List handlers
  const handleIssueChange = (idx: number, field: string, value: any) => {
    const updated = issues.map((iss, i) =>
      i === idx ? { ...iss, [field]: value } : iss
    )
    setIssues(updated)
    handleChange("issues_list", updated)
  }
  const addIssue = () => {
    const updated = [...issues, { issue: "", severity: "", recommendation: "" }]
    setIssues(updated)
    handleChange("issues_list", updated)
  }
  const removeIssue = (idx: number) => {
    const updated = issues.filter((_, i) => i !== idx)
    setIssues(updated)
    handleChange("issues_list", updated)
  }

  // Decision Result handlers
  const handleDecisionChange = (field: string, value: any) => {
    const updated = { ...decision, [field]: value }
    handleChange("decision_result", updated)
  }

  // Guardrail Violations handlers
  const handleViolationChange = (step: string, idx: number, field: string, value: any) => {
    const stepViolations = violations[step] || []
    const updatedStep = stepViolations.map((v: any, i: number) =>
      i === idx ? { ...v, [field]: value } : v
    )
    const updated = { ...violations, [step]: updatedStep }
    setViolations(updated)
    handleChange("guardrail_violations", updated)
  }
  const addViolation = (step: string) => {
    const updated = { ...violations, [step]: [...(violations[step] || []), { ruleId: "", description: "", severity: "" }] }
    setViolations(updated)
    handleChange("guardrail_violations", updated)
  }
  const removeViolation = (step: string, idx: number) => {
    const updatedStep = (violations[step] || []).filter((_: any, i: number) => i !== idx)
    const updated = { ...violations, [step]: updatedStep }
    setViolations(updated)
    handleChange("guardrail_violations", updated)
  }

  // Feedbacks handlers
  const handleFeedbackChange = (step: string, value: string) => {
    const updated = { ...feedbacks, [step]: value }
    setFeedbacks(updated)
    handleChange("feedbacks", updated)
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        onSave(form)
      }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Draft Submission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Project Title</label>
            <Input
              value={draft.project_title || ""}
              onChange={e => handleDraftChange("project_title", e.target.value)}
              placeholder="Project Title"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Description</label>
            <Textarea
              value={draft.description || ""}
              onChange={e => handleDraftChange("description", e.target.value)}
              placeholder="Project Description"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Objectives</label>
            <div className="space-y-2">
              {objectives.map((obj, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={obj}
                    onChange={e => handleObjectiveChange(idx, e.target.value)}
                    placeholder={`Objective ${idx + 1}`}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => removeObjective(idx)}>-</Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={addObjective}>Add Objective</Button>
            </div>
          </div>
          <div>
            <label className="block font-medium mb-1">Benefits</label>
            <Textarea
              value={draft.benefits || ""}
              onChange={e => handleDraftChange("benefits", e.target.value)}
              placeholder="Benefits"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Deliverables</label>
            <Textarea
              value={draft.deliverables || ""}
              onChange={e => handleDraftChange("deliverables", e.target.value)}
              placeholder="Deliverables"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Risk Mapping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {risks.map((risk, idx) => (
            <div key={idx} className="flex flex-col md:flex-row gap-2 items-center border-b pb-2 mb-2">
              <Input
                className="flex-1"
                value={risk.risk || ""}
                onChange={e => handleRiskChange(idx, "risk", e.target.value)}
                placeholder="Risk Name"
              />
              <Input
                className="flex-1"
                value={risk.category || ""}
                onChange={e => handleRiskChange(idx, "category", e.target.value)}
                placeholder="Category"
              />
              <Input
                className="w-24"
                type="number"
                value={risk.confidence || 0}
                min={0}
                max={1}
                step={0.01}
                onChange={e => handleRiskChange(idx, "confidence", parseFloat(e.target.value))}
                placeholder="Confidence"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => removeRisk(idx)}>-</Button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={addRisk}>Add Risk</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Controls Mapping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {controls.map((control, idx) => (
            <div key={idx} className="flex flex-col md:flex-row gap-2 items-center border-b pb-2 mb-2">
              <Input
                className="flex-1"
                value={control.risk || ""}
                onChange={e => handleControlChange(idx, "risk", e.target.value)}
                placeholder="Risk Name"
              />
              <Textarea
                className="flex-1"
                value={Array.isArray(control.controls) ? control.controls.join(", ") : control.controls || ""}
                onChange={e => handleControlChange(idx, "controls", e.target.value.split(",").map((s: string) => s.trim()))}
                placeholder="Controls (comma separated)"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => removeControl(idx)}>-</Button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={addControl}>Add Control Mapping</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mitigation Proposals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mitigations.map((mit, idx) => (
            <div key={idx} className="flex flex-col md:flex-row gap-2 items-center border-b pb-2 mb-2">
              <Input
                className="flex-1"
                value={mit.risk || ""}
                onChange={e => handleMitigationChange(idx, "risk", e.target.value)}
                placeholder="Risk Name"
              />
              <Input
                className="flex-1"
                value={mit.control_id || ""}
                onChange={e => handleMitigationChange(idx, "control_id", e.target.value)}
                placeholder="Control ID"
              />
              <Textarea
                className="flex-1"
                value={mit.mitigation_steps || ""}
                onChange={e => handleMitigationChange(idx, "mitigation_steps", e.target.value)}
                placeholder="Mitigation Steps"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => removeMitigation(idx)}>-</Button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={addMitigation}>Add Mitigation</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Issues List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {issues.map((iss, idx) => (
            <div key={idx} className="flex flex-col md:flex-row gap-2 items-center border-b pb-2 mb-2">
              <Input
                className="flex-1"
                value={iss.issue || ""}
                onChange={e => handleIssueChange(idx, "issue", e.target.value)}
                placeholder="Issue"
              />
              <Input
                className="w-32"
                value={iss.severity || ""}
                onChange={e => handleIssueChange(idx, "severity", e.target.value)}
                placeholder="Severity"
              />
              <Textarea
                className="flex-1"
                value={iss.recommendation || ""}
                onChange={e => handleIssueChange(idx, "recommendation", e.target.value)}
                placeholder="Recommendation"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => removeIssue(idx)}>-</Button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={addIssue}>Add Issue</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Decision Result</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Decision</label>
            <Input
              value={decision.decision || ""}
              onChange={e => handleDecisionChange("decision", e.target.value)}
              placeholder="Approved / Rejected"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Rationale</label>
            <Textarea
              value={decision.rationale || ""}
              onChange={e => handleDecisionChange("rationale", e.target.value)}
              placeholder="Rationale"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guardrail Violations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(violations).length === 0 && <div className="text-muted-foreground">No guardrail violations.</div>}
          {Object.entries(violations).map(([step, stepViolations]) => {
            const arr = Array.isArray(stepViolations) ? stepViolations : [];
            return (
              <div key={step} className="mb-4">
                <div className="font-semibold mb-2">Step: {step}</div>
                {arr.map((v, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row gap-2 items-center border-b pb-2 mb-2">
                    <Input
                      className="w-32"
                      value={v.ruleId || ""}
                      onChange={e => handleViolationChange(step, idx, "ruleId", e.target.value)}
                      placeholder="Rule ID"
                    />
                    <Input
                      className="flex-1"
                      value={v.description || ""}
                      onChange={e => handleViolationChange(step, idx, "description", e.target.value)}
                      placeholder="Description"
                    />
                    <Input
                      className="w-32"
                      value={v.severity || ""}
                      onChange={e => handleViolationChange(step, idx, "severity", e.target.value)}
                      placeholder="Severity"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => removeViolation(step, idx)}>-</Button>
                  </div>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={() => addViolation(step)}>Add Violation</Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feedbacks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(feedbacks).length === 0 && <div className="text-muted-foreground">No feedbacks.</div>}
          {Object.entries(feedbacks).map(([step, value]) => (
            <div key={step} className="flex flex-col md:flex-row gap-2 items-center border-b pb-2 mb-2">
              <div className="w-48 font-semibold">Step: {step}</div>
              <Textarea
                className="flex-1"
                value={value}
                onChange={e => handleFeedbackChange(step, e.target.value)}
                placeholder="Feedback"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </form>
  )
}
