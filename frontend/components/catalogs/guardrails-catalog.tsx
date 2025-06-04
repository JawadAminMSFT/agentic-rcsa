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
import { AlertCircle, Plus, Edit } from "lucide-react"

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
    return <div className="text-center py-8 text-gray-500">Loading guardrails...</div>
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
        <CardTitle className="text-lg font-semibold text-gray-900">Guardrails</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              onClick={handleAddGuardrail}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-sm"
            >
              <Plus className="h-3 w-3 mr-2" />
              Add Guardrail
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Add New Guardrail</DialogTitle>
              <DialogDescription>
                Add a new guardrail rule to the catalog. Fill in the details below.
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
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Save Guardrail
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
                <TableHead className="text-gray-700 font-medium">Description</TableHead>
                <TableHead className="text-gray-700 font-medium">Severity</TableHead>
                <TableHead className="text-gray-700 font-medium">Applicable Steps</TableHead>
                <TableHead className="text-right text-gray-700 font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guardrails.map((guardrail: Guardrail) => (
                <TableRow key={guardrail.id} className="border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">{guardrail.id}</TableCell>
                  <TableCell className="max-w-md text-gray-700">
                    <div className="truncate" title={guardrail.description}>
                      {guardrail.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <SeverityBadge severity={guardrail.severity} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {guardrail.applicableSteps && guardrail.applicableSteps.length > 0 ? (
                        guardrail.applicableSteps.map((step) => (
                          <Badge key={step} variant="outline" className="text-xs">
                            {step}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditGuardrail(guardrail)}
                          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[525px]">
                        <DialogHeader>
                          <DialogTitle>Edit Guardrail</DialogTitle>
                          <DialogDescription>
                            Update the guardrail details below.
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
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
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
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No guardrails found. Click "Add Guardrail" to get started.
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
      return <Badge variant="destructive">High</Badge>
    case "medium":
      return <Badge variant="secondary">Medium</Badge>
    default:
      return <Badge variant="outline">Low</Badge>
  }
}
