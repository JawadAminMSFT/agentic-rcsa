"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { getGuardrails, addGuardrail, updateGuardrail } from "@/lib/api-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Plus, Edit, Shield, FileCheck, Zap, AlertTriangle } from "lucide-react"

interface Guardrail {
  id: string
  description: string
  severity: string
  applicableSteps?: string[]
}

export default function GuardrailsCatalog() {
  const [guardrails, setGuardrails] = useState<Guardrail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingGuardrail, setEditingGuardrail] = useState<Guardrail | null>(null)
  const [formData, setFormData] = useState({
    id: "",
    description: "",
    severity: "",
    applicableSteps: ""
  })

  useEffect(() => {
    async function loadGuardrails() {
      try {
        const data = await getGuardrails()
        setGuardrails(data)
      } catch (err) {
        console.error("Failed to load guardrails:", err)
        setError("Failed to load guardrails. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadGuardrails()
  }, [])

  const handleAddGuardrail = () => {
    setFormData({ id: "", description: "", severity: "", applicableSteps: "" })
    setIsAddDialogOpen(true)
  }

  const handleEditGuardrail = (guardrail: Guardrail) => {
    setEditingGuardrail(guardrail)
    setFormData({
      id: guardrail.id,
      description: guardrail.description,
      severity: guardrail.severity,
      applicableSteps: guardrail.applicableSteps ? guardrail.applicableSteps.join(", ") : ""
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveGuardrail = async () => {
    try {
      const guardrailData = {
        ...formData,
        applicableSteps: formData.applicableSteps.split(",").map(step => step.trim()).filter(step => step.length > 0)
      }

      if (editingGuardrail) {
        // Update existing guardrail
        await updateGuardrail(editingGuardrail.id, guardrailData)
        setGuardrails(guardrails.map(guardrail => 
          guardrail.id === editingGuardrail.id 
            ? { ...guardrailData } as Guardrail
            : guardrail
        ))
        setIsEditDialogOpen(false)
        setEditingGuardrail(null)
      } else {
        // Add new guardrail
        await addGuardrail(guardrailData)
        const newGuardrail = { ...guardrailData } as Guardrail
        setGuardrails([...guardrails, newGuardrail])
        setIsAddDialogOpen(false)
      }
      
      setFormData({ id: "", description: "", severity: "", applicableSteps: "" })
    } catch (err) {
      console.error("Failed to save guardrail:", err)
      setError("Failed to save guardrail. Please try again.")
    }
  }

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-sm font-medium">Loading guardrails...</span>
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
    <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-blue-50/20 to-cyan-50/30 backdrop-blur-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50/50 via-cyan-50/30 to-blue-50/50 border-b border-blue-100/50 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Guardrails
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <FileCheck className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-gray-600 font-medium">
                  {guardrails.length} guardrails configured
                </span>
              </div>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="lg" 
                onClick={handleAddGuardrail}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Guardrail
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px] bg-white/95 backdrop-blur-lg border border-white/20 shadow-2xl">
              <DialogHeader className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                    <Plus className="h-5 w-5" />
                  </div>
                  <DialogTitle className="text-xl font-semibold">Add New Guardrail</DialogTitle>
                </div>
                <DialogDescription className="text-gray-600 leading-relaxed">
                  Add a new guardrail rule to the catalog. Fill in the details below to enhance system protection.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="id" className="text-right text-sm">
                    ID
                  </Label>
                  <Input
                    id="id"
                    value={formData.id}
                    onChange={(e) => handleFormChange("id", e.target.value)}
                    className="col-span-3"
                    placeholder="e.g., G1"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right text-sm">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleFormChange("description", e.target.value)}
                    className="col-span-3"
                    rows={3}
                    placeholder="Describe the guardrail rule..."
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="severity" className="text-right text-sm">
                    Severity
                  </Label>
                  <Select onValueChange={(value) => handleFormChange("severity", value)}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="applicableSteps" className="text-right text-sm">
                    Applicable Steps
                  </Label>
                  <Input
                    id="applicableSteps"
                    value={formData.applicableSteps}
                    onChange={(e) => handleFormChange("applicableSteps", e.target.value)}
                    className="col-span-3"
                    placeholder="generate_draft, map_risks (comma-separated)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  onClick={handleSaveGuardrail}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                >
                  Save Guardrail
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
              <TableRow className="bg-gradient-to-r from-gray-50 to-blue-50/30 border-gray-200/50 hover:bg-gray-50/80">
                <TableHead className="text-gray-800 font-semibold py-4 px-6">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    ID
                  </div>
                </TableHead>
                <TableHead className="text-gray-800 font-semibold py-4">Description</TableHead>
                <TableHead className="text-gray-800 font-semibold py-4">Severity</TableHead>
                <TableHead className="text-gray-800 font-semibold py-4">Applicable Steps</TableHead>
                <TableHead className="text-right text-gray-800 font-semibold py-4 pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guardrails.map((guardrail: Guardrail, index: number) => (
                <TableRow 
                  key={guardrail.id} 
                  className="border-gray-200/50 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-cyan-50/20 transition-all duration-300 group"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <TableCell className="font-bold text-blue-700 py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"></div>
                      {guardrail.id}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-700 py-4 max-w-md">
                    <div className="truncate" title={guardrail.description}>
                      {guardrail.description}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <SeverityBadge severity={guardrail.severity} />
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-wrap gap-1">
                      {guardrail.applicableSteps && guardrail.applicableSteps.length > 0 ? (
                        guardrail.applicableSteps.slice(0, 3).map((step) => (
                          <Badge key={step} variant="secondary" className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                            {step}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm italic">No steps defined</span>
                      )}
                      {guardrail.applicableSteps && guardrail.applicableSteps.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{guardrail.applicableSteps.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-4 pr-6">
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditGuardrail(guardrail)}
                          className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[525px] bg-white/95 backdrop-blur-lg border border-white/20 shadow-2xl">
                        <DialogHeader className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                              <Edit className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-xl font-semibold">Edit Guardrail</DialogTitle>
                          </div>
                          <DialogDescription className="text-gray-600 leading-relaxed">
                            Update the guardrail details below to maintain system protection standards.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-id" className="text-right text-sm">
                              ID
                            </Label>
                            <Input
                              id="edit-id"
                              value={formData.id}
                              onChange={(e) => handleFormChange("id", e.target.value)}
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-description" className="text-right text-sm">
                              Description
                            </Label>
                            <Textarea
                              id="edit-description"
                              value={formData.description}
                              onChange={(e) => handleFormChange("description", e.target.value)}
                              className="col-span-3"
                              rows={3}
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-severity" className="text-right text-sm">
                              Severity
                            </Label>
                            <Select 
                              value={formData.severity} 
                              onValueChange={(value) => handleFormChange("severity", value)}
                            >
                              <SelectTrigger className="col-span-3">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-applicableSteps" className="text-right text-sm">
                              Applicable Steps
                            </Label>
                            <Input
                              id="edit-applicableSteps"
                              value={formData.applicableSteps}
                              onChange={(e) => handleFormChange("applicableSteps", e.target.value)}
                              className="col-span-3"
                              placeholder="generate_draft, map_risks (comma-separated)"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            type="submit" 
                            onClick={handleSaveGuardrail}
                            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                          >
                            Update Guardrail
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {guardrails.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 rounded-full bg-gray-100">
                        <Shield className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">No guardrails found</h3>
                        <p className="text-gray-500 text-sm">Click "Add Guardrail" to start building your protection rules.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  switch (severity.toLowerCase()) {
    case "high":
      return (
        <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 shadow-sm">
          <AlertTriangle className="h-3 w-3 mr-1" />
          High
        </Badge>
      )
    case "medium":
      return (
        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-sm">
          <AlertCircle className="h-3 w-3 mr-1" />
          Medium
        </Badge>
      )
    default:
      return (
        <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-sm">
          <FileCheck className="h-3 w-3 mr-1" />
          Low
        </Badge>
      )
  }
}
