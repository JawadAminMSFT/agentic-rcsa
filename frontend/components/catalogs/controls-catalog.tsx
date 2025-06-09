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
import { getControls, addControl, updateControl } from "@/lib/api-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Plus, Edit } from "lucide-react"

interface Control {
  id: string
  name: string
  description?: string
  subriskIds?: string[]
}

export default function ControlsCatalog() {
  const [controls, setControls] = useState<Control[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingControl, setEditingControl] = useState<Control | null>(null)
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    subriskIds: ""
  })

  useEffect(() => {
    async function loadControls() {
      try {
        const data = await getControls()
        setControls(data)
      } catch (err) {
        console.error("Failed to load controls:", err)
        setError("Failed to load controls. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadControls()
  }, [])

  const handleAddControl = () => {
    setFormData({ id: "", name: "", description: "", subriskIds: "" })
    setIsAddDialogOpen(true)
  }

  const handleEditControl = (control: Control) => {
    setEditingControl(control)
    setFormData({
      id: control.id,
      name: control.name,
      description: control.description || "",
      subriskIds: control.subriskIds ? control.subriskIds.join(", ") : ""
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveControl = async () => {
    try {
      const controlData = {
        ...formData,
        subriskIds: formData.subriskIds.split(",").map(id => id.trim()).filter(id => id.length > 0)
      }

      if (editingControl) {
        // Update existing control
        await updateControl(editingControl.id, controlData)
        setControls(controls.map(control => 
          control.id === editingControl.id 
            ? { ...controlData } as Control
            : control
        ))
        setIsEditDialogOpen(false)
        setEditingControl(null)
      } else {
        // Add new control
        await addControl(controlData)
        const newControl = { ...controlData } as Control
        setControls([...controls, newControl])
        setIsAddDialogOpen(false)
      }
      
      setFormData({ id: "", name: "", description: "", subriskIds: "" })
    } catch (err) {
      console.error("Failed to save control:", err)
      setError("Failed to save control. Please try again.")
    }
  }

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading controls...</div>
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
        <CardTitle className="text-lg font-semibold text-gray-900">Controls Library</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              onClick={handleAddControl}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-sm"
            >
              <Plus className="h-3 w-3 mr-2" />
              Add Control
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Add New Control</DialogTitle>
              <DialogDescription>
                Add a new control to the catalog. Fill in the details below.
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
                  placeholder="e.g., C001"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right text-sm">
                  Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., MFA Enforcement"
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
                  placeholder="Describe the control implementation..."
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="subriskIds" className="text-right text-sm">
                  Risk IDs
                </Label>
                <Input
                  id="subriskIds"
                  value={formData.subriskIds}
                  onChange={(e) => handleFormChange("subriskIds", e.target.value)}
                  className="col-span-3"
                  placeholder="R1, R2, R3 (comma-separated)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={handleSaveControl}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Save Control
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
                <TableHead className="text-gray-700 font-medium">Name</TableHead>
                <TableHead className="text-gray-700 font-medium">Description</TableHead>
                <TableHead className="text-gray-700 font-medium">Risk IDs</TableHead>
                <TableHead className="text-right text-gray-700 font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {controls.map((control: Control) => (
                <TableRow key={control.id} className="border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">{control.id}</TableCell>
                  <TableCell className="text-gray-700">{control.name}</TableCell>
                  <TableCell className="max-w-md text-gray-700">
                    <div className="truncate" title={control.description}>
                      {control.description || <span className="text-gray-400">-</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {control.subriskIds && control.subriskIds.length > 0 ? (
                        control.subriskIds.map((riskId) => (
                          <Badge key={riskId} variant="secondary" className="text-xs">
                            {riskId}
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
                          onClick={() => handleEditControl(control)}
                          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[525px]">
                        <DialogHeader>
                          <DialogTitle>Edit Control</DialogTitle>
                          <DialogDescription>
                            Update the control details below.
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
                            <Label htmlFor="edit-name" className="text-right text-sm">
                              Name
                            </Label>
                            <Input
                              id="edit-name"
                              value={formData.name}
                              onChange={(e) => handleFormChange("name", e.target.value)}
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
                            <Label htmlFor="edit-subriskIds" className="text-right text-sm">
                              Risk IDs
                            </Label>
                            <Input
                              id="edit-subriskIds"
                              value={formData.subriskIds}
                              onChange={(e) => handleFormChange("subriskIds", e.target.value)}
                              className="col-span-3"
                              placeholder="R1, R2, R3 (comma-separated)"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            type="submit" 
                            onClick={handleSaveControl}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                          >
                            Update Control
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {controls.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No controls found. Click "Add Control" to get started.
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
