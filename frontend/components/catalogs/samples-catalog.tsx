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
import { AlertCircle, Plus, Edit, Eye, History } from "lucide-react"

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
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
          <span className="text-sm font-medium">Loading past submissions...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="border-red-200 bg-red-50/50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <div className="space-y-2">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 bg-clip-text text-transparent">
            Past Submissions
          </CardTitle>
          <p className="text-gray-600 text-sm font-medium">
            Repository of historical RCSA submissions and analysis results
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-500 text-xs bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
            <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
            {samples.length} submissions
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                onClick={handleAddSample}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 border-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Sample
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Add New Sample Submission
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  Add a new sample submission to the catalog. Fill in the basic details below.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="submissionId" className="text-right text-sm font-medium text-gray-700">
                    Submission ID
                  </Label>
                  <Input
                    id="submissionId"
                    value={formData.submissionId}
                    onChange={(e) => handleFormChange("submissionId", e.target.value)}
                    className="col-span-3 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                    placeholder="e.g., P100"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="project_summary" className="text-right text-sm font-medium text-gray-700">
                    Project Summary
                  </Label>
                  <Textarea
                    id="project_summary"
                    value={formData.project_summary}
                    onChange={(e) => handleFormChange("project_summary", e.target.value)}
                    className="col-span-3 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                    rows={4}
                    placeholder="Brief description of the project..."
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="identified_risks" className="text-right text-sm font-medium text-gray-700">
                    Identified Risks
                  </Label>
                  <Textarea
                    id="identified_risks"
                    value={formData.identified_risks}
                    onChange={(e) => handleFormChange("identified_risks", e.target.value)}
                    className="col-span-3 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                    rows={3}
                    placeholder="Risk 1, Risk 2, Risk 3 (comma-separated)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  onClick={handleSaveSample}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  Save Sample
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-100/50 m-6 overflow-hidden shadow-lg">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200/50 bg-gradient-to-r from-purple-50/50 to-pink-50/50">
                <TableHead className="text-gray-700 font-semibold py-4 px-6">Submission ID</TableHead>
                <TableHead className="text-gray-700 font-semibold py-4">Project Summary</TableHead>
                <TableHead className="text-gray-700 font-semibold py-4">Identified Risks</TableHead>
                <TableHead className="text-right text-gray-700 font-semibold py-4 px-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {samples.map((sample: SampleSubmission) => (
                <TableRow key={sample.submissionId} className="border-gray-200/50 hover:bg-gradient-to-r hover:from-purple-50/30 hover:to-pink-50/30 transition-all duration-200">
                  <TableCell className="font-semibold text-purple-700 py-4 px-6">{sample.submissionId}</TableCell>
                  <TableCell className="max-w-md text-gray-700 py-4">
                    <div className="truncate font-medium" title={sample.draft?.project_summary}>
                      {sample.draft?.project_summary || <span className="text-gray-400 italic">No summary</span>}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {sample.draft?.identified_risks && sample.draft.identified_risks.length > 0 ? (
                        sample.draft.identified_risks.slice(0, 2).map((risk, index) => (
                          <Badge key={index} variant="secondary" className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                            {risk}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm italic">No risks identified</span>
                      )}
                      {sample.draft?.identified_risks && sample.draft.identified_risks.length > 2 && (
                        <Badge variant="outline" className="text-xs border-purple-200 text-purple-600">
                          +{sample.draft.identified_risks.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-4 px-6">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewSample(sample)}
                        className="text-gray-600 hover:text-purple-700 hover:bg-purple-50"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        View
                      </Button>
                      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditSample(sample)}
                            className="text-gray-600 hover:text-purple-700 hover:bg-purple-50"
                          >
                            <Edit className="h-3.5 w-3.5 mr-1.5" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[625px]">
                          <DialogHeader>
                            <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                              Edit Sample Submission
                            </DialogTitle>
                            <DialogDescription className="text-gray-600">
                              Update the sample submission details below.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-6 py-6">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="edit-submissionId" className="text-right text-sm font-medium text-gray-700">
                                Submission ID
                              </Label>
                              <Input
                                id="edit-submissionId"
                                value={formData.submissionId}
                                onChange={(e) => handleFormChange("submissionId", e.target.value)}
                                className="col-span-3 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="edit-project_summary" className="text-right text-sm font-medium text-gray-700">
                                Project Summary
                              </Label>
                              <Textarea
                                id="edit-project_summary"
                                value={formData.project_summary}
                                onChange={(e) => handleFormChange("project_summary", e.target.value)}
                                className="col-span-3 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                                rows={4}
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="edit-identified_risks" className="text-right text-sm font-medium text-gray-700">
                                Identified Risks
                              </Label>
                              <Textarea
                                id="edit-identified_risks"
                                value={formData.identified_risks}
                                onChange={(e) => handleFormChange("identified_risks", e.target.value)}
                                className="col-span-3 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                                rows={3}
                                placeholder="Risk 1, Risk 2, Risk 3 (comma-separated)"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button 
                              type="submit" 
                              onClick={handleSaveSample}
                              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
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
                  <TableCell colSpan={4} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <History className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900">No past submissions found</p>
                        <p className="text-sm text-gray-500">Click "Add Sample" to get started with your first submission.</p>
                      </div>
                    </div>
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
            <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Sample Submission Details
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Complete details for submission {viewingSample?.submissionId}
            </DialogDescription>
          </DialogHeader>
          {viewingSample && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide">Project Summary</h4>
                <div className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 border border-purple-100 rounded-lg p-4">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {viewingSample.draft?.project_summary}
                  </p>
                </div>
              </div>
              
              {viewingSample.draft?.identified_risks && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide">Identified Risks</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingSample.draft.identified_risks.map((risk, index) => (
                      <Badge key={index} className="bg-purple-100 text-purple-700 border-purple-200">{risk}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {viewingSample.mapping && viewingSample.mapping.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide">Risk Mapping</h4>
                  <div className="space-y-3">
                    {viewingSample.mapping.map((mapping, index) => (
                      <div key={index} className="bg-gradient-to-r from-purple-50/30 to-pink-50/30 border border-purple-100 rounded-lg p-4">
                        <div className="font-medium text-gray-900 mb-1">{mapping.risk}</div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div><span className="font-medium">Category:</span> {mapping.category}</div>
                          <div><span className="font-medium">Confidence:</span> {(mapping.confidence * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingSample.controls && viewingSample.controls.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide">Controls</h4>
                  <div className="space-y-3">
                    {viewingSample.controls.map((control, index) => (
                      <div key={index} className="bg-gradient-to-r from-purple-50/30 to-pink-50/30 border border-purple-100 rounded-lg p-4">
                        <div className="font-medium text-gray-900 mb-1">{control.name} ({control.control_id})</div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Relevance Score:</span> {(control.relevance_score * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingSample.issues && viewingSample.issues.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide">Issues</h4>
                  <div className="space-y-3">
                    {viewingSample.issues.map((issue, index) => (
                      <div key={index} className="bg-gradient-to-r from-purple-50/30 to-pink-50/30 border border-purple-100 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">{issue.issue}</span>
                          <Badge 
                            variant={issue.severity === 'High' ? 'destructive' : issue.severity === 'Medium' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {issue.severity}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Recommendation:</span> {issue.recommendation}
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
