"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { getSamples, addSample, updateSample } from "@/lib/api-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Plus, Edit, Eye } from "lucide-react"

interface SampleSubmission {
  submissionId: string
  draft: {
    project_summary: string
    identified_risks?: string[]
  }
  mapping?: Array<{
    risk: string
    category: string
    subrisk: string
    confidence: number
  }>
  controls?: Array<{
    control_id: string
    name: string
    relevance_score: number
  }>
  mitigation?: Array<{
    risk: string
    control_id: string
    mitigation_steps: string[]
  }>
  issues?: Array<{
    issue: string
    severity: string
    recommendation: string
  }>
}

export default function SamplesCatalog() {
  const [samples, setSamples] = useState<SampleSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [editingSample, setEditingSample] = useState<SampleSubmission | null>(null)
  const [viewingSample, setViewingSample] = useState<SampleSubmission | null>(null)
  const [formData, setFormData] = useState({
    submissionId: "",
    project_summary: "",
    identified_risks: ""
  })

  useEffect(() => {
    async function loadSamples() {
      try {
        const data = await getSamples()
        setSamples(data)
      } catch (err) {
        console.error("Failed to load samples:", err)
        setError("Failed to load samples. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadSamples()
  }, [])

  const handleAddSample = () => {
    setFormData({ submissionId: "", project_summary: "", identified_risks: "" })
    setIsAddDialogOpen(true)
  }

  const handleEditSample = (sample: SampleSubmission) => {
    setEditingSample(sample)
    setFormData({
      submissionId: sample.submissionId,
      project_summary: sample.draft.project_summary,
      identified_risks: sample.draft.identified_risks ? sample.draft.identified_risks.join(", ") : ""
    })
    setIsEditDialogOpen(true)
  }

  const handleViewSample = (sample: SampleSubmission) => {
    setViewingSample(sample)
    setIsViewDialogOpen(true)
  }

  const handleSaveSample = async () => {
    try {
      const sampleData = {
        submissionId: formData.submissionId,
        draft: {
          project_summary: formData.project_summary,
          identified_risks: formData.identified_risks.split(",").map(risk => risk.trim()).filter(risk => risk.length > 0)
        }
      }

      if (editingSample) {
        // Update existing sample - preserve existing data structure
        const updatedSample = {
          ...editingSample,
          ...sampleData
        }
        await updateSample(editingSample.submissionId, updatedSample)
        setSamples(samples.map(sample => 
          sample.submissionId === editingSample.submissionId 
            ? updatedSample as SampleSubmission
            : sample
        ))
        setIsEditDialogOpen(false)
        setEditingSample(null)
      } else {
        // Add new sample
        await addSample(sampleData)
        const newSample = sampleData as SampleSubmission
        setSamples([...samples, newSample])
        setIsAddDialogOpen(false)
      }
      
      setFormData({ submissionId: "", project_summary: "", identified_risks: "" })
    } catch (err) {
      console.error("Failed to save sample:", err)
      setError("Failed to save sample. Please try again.")
    }
  }

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading past submissions...</div>
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900">Past Submissions</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              onClick={handleAddSample}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-sm"
            >
              <Plus className="h-3 w-3 mr-2" />
              Add Sample
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Add New Sample Submission</DialogTitle>
              <DialogDescription>
                Add a new sample submission to the catalog. Fill in the basic details below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="submissionId" className="text-right text-sm">
                  Submission ID
                </Label>
                <Input
                  id="submissionId"
                  value={formData.submissionId}
                  onChange={(e) => handleFormChange("submissionId", e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., P100"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="project_summary" className="text-right text-sm">
                  Project Summary
                </Label>
                <Textarea
                  id="project_summary"
                  value={formData.project_summary}
                  onChange={(e) => handleFormChange("project_summary", e.target.value)}
                  className="col-span-3"
                  rows={4}
                  placeholder="Brief description of the project..."
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="identified_risks" className="text-right text-sm">
                  Identified Risks
                </Label>
                <Textarea
                  id="identified_risks"
                  value={formData.identified_risks}
                  onChange={(e) => handleFormChange("identified_risks", e.target.value)}
                  className="col-span-3"
                  rows={3}
                  placeholder="Risk 1, Risk 2, Risk 3 (comma-separated)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={handleSaveSample}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Save Sample
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="bg-white rounded-lg border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200">
                <TableHead className="text-gray-700 font-medium">ID</TableHead>
                <TableHead className="text-gray-700 font-medium">Project Summary</TableHead>
                <TableHead className="text-gray-700 font-medium">Identified Risks</TableHead>
                <TableHead className="text-right text-gray-700 font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {samples.map((sample: SampleSubmission) => (
                <TableRow key={sample.submissionId} className="border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">{sample.submissionId}</TableCell>
                  <TableCell className="max-w-md text-gray-700">
                    <div className="truncate" title={sample.draft?.project_summary}>
                      {sample.draft?.project_summary || <span className="text-gray-400">-</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {sample.draft?.identified_risks && sample.draft.identified_risks.length > 0 ? (
                        sample.draft.identified_risks.slice(0, 2).map((risk, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {risk}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                      {sample.draft?.identified_risks && sample.draft.identified_risks.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{sample.draft.identified_risks.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewSample(sample)}
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditSample(sample)}
                            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[625px]">
                          <DialogHeader>
                            <DialogTitle>Edit Sample Submission</DialogTitle>
                            <DialogDescription>
                              Update the sample submission details below.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="edit-submissionId" className="text-right text-sm">
                                Submission ID
                              </Label>
                              <Input
                                id="edit-submissionId"
                                value={formData.submissionId}
                                onChange={(e) => handleFormChange("submissionId", e.target.value)}
                                className="col-span-3"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="edit-project_summary" className="text-right text-sm">
                                Project Summary
                              </Label>
                              <Textarea
                                id="edit-project_summary"
                                value={formData.project_summary}
                                onChange={(e) => handleFormChange("project_summary", e.target.value)}
                                className="col-span-3"
                                rows={4}
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="edit-identified_risks" className="text-right text-sm">
                                Identified Risks
                              </Label>
                              <Textarea
                                id="edit-identified_risks"
                                value={formData.identified_risks}
                                onChange={(e) => handleFormChange("identified_risks", e.target.value)}
                                className="col-span-3"
                                rows={3}
                                placeholder="Risk 1, Risk 2, Risk 3 (comma-separated)"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button 
                              type="submit" 
                              onClick={handleSaveSample}
                              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                            >
                              Update Sample
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {samples.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    No past submissions found. Click "Add Sample" to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* View Sample Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sample Submission Details</DialogTitle>
            <DialogDescription>
              Complete details for submission {viewingSample?.submissionId}
            </DialogDescription>
          </DialogHeader>
          {viewingSample && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Project Summary</h4>
                <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-md">
                  {viewingSample.draft?.project_summary}
                </p>
              </div>
              
              {viewingSample.draft?.identified_risks && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Identified Risks</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingSample.draft.identified_risks.map((risk, index) => (
                      <Badge key={index} variant="secondary">{risk}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {viewingSample.mapping && viewingSample.mapping.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Risk Mapping</h4>
                  <div className="space-y-2">
                    {viewingSample.mapping.map((mapping, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-md text-sm">
                        <div className="font-medium">{mapping.risk}</div>
                        <div className="text-gray-600">
                          Category: {mapping.category} | Confidence: {(mapping.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingSample.controls && viewingSample.controls.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Controls</h4>
                  <div className="space-y-2">
                    {viewingSample.controls.map((control, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-md text-sm">
                        <div className="font-medium">{control.name} ({control.control_id})</div>
                        <div className="text-gray-600">
                          Relevance Score: {(control.relevance_score * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingSample.issues && viewingSample.issues.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Issues</h4>
                  <div className="space-y-2">
                    {viewingSample.issues.map((issue, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-md text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{issue.issue}</span>
                          <Badge 
                            variant={issue.severity === 'High' ? 'destructive' : issue.severity === 'Medium' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {issue.severity}
                          </Badge>
                        </div>
                        <div className="text-gray-600">
                          <strong>Recommendation:</strong> {issue.recommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
