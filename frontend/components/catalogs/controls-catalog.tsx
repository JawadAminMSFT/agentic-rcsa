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
import { AlertCircle, Plus, Edit, Database, Settings, Lock, Zap } from "lucide-react"

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
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-500 border-t-transparent"></div>
          <span className="text-sm font-medium">Loading controls library...</span>
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
    <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-green-50/20 to-emerald-50/30 backdrop-blur-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-50/50 via-emerald-50/30 to-green-50/50 border-b border-green-100/50 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Controls Library
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Lock className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600 font-medium">
                  {controls.length} controls available
                </span>
              </div>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="lg" 
                onClick={handleAddControl}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Control
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px] bg-white/95 backdrop-blur-lg border border-white/20 shadow-2xl">
              <DialogHeader className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                    <Plus className="h-5 w-5" />
                  </div>
                  <DialogTitle className="text-xl font-semibold">Add New Control</DialogTitle>
                </div>
                <DialogDescription className="text-gray-600 leading-relaxed">
                  Add a new control to the catalog. Fill in the details below to expand the control library.
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
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                >
                  Save Control
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
              <TableRow className="bg-gradient-to-r from-gray-50 to-green-50/30 border-gray-200/50 hover:bg-gray-50/80">
                <TableHead className="text-gray-800 font-semibold py-4 px-6">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-green-500" />
                    ID
                  </div>
                </TableHead>
                <TableHead className="text-gray-800 font-semibold py-4">Name</TableHead>
                <TableHead className="text-gray-800 font-semibold py-4">Description</TableHead>
                <TableHead className="text-gray-800 font-semibold py-4">Risk IDs</TableHead>
                <TableHead className="text-right text-gray-800 font-semibold py-4 pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {controls.map((control: Control, index: number) => (
                <TableRow 
                  key={control.id} 
                  className="border-gray-200/50 hover:bg-gradient-to-r hover:from-green-50/30 hover:to-emerald-50/20 transition-all duration-300 group"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <TableCell className="font-bold text-green-700 py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full"></div>
                      {control.id}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-700 font-medium py-4">{control.name}</TableCell>
                  <TableCell className="text-gray-700 py-4 max-w-md">
                    <div className="truncate" title={control.description}>
                      {control.description || <span className="text-gray-400 italic">No description</span>}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-wrap gap-1">
                      {control.subriskIds && control.subriskIds.length > 0 ? (
                        control.subriskIds.map((riskId) => (
                          <Badge key={riskId} variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                            {riskId}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm italic">No risks linked</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-4 pr-6">
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditControl(control)}
                          className="text-gray-600 hover:text-green-700 hover:bg-green-50 transition-all duration-200 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[525px] bg-white/95 backdrop-blur-lg border border-white/20 shadow-2xl">
                        <DialogHeader className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                              <Edit className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-xl font-semibold">Edit Control</DialogTitle>
                          </div>
                          <DialogDescription className="text-gray-600 leading-relaxed">
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
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
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
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 rounded-full bg-gray-100">
                        <Database className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">No controls found</h3>
                        <p className="text-gray-500 text-sm">Click "Add Control" to start building your controls library.</p>
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
