"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getRisks, addRisk, updateRisk } from "@/lib/api-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Plus, Edit } from "lucide-react"

interface Risk {
  id: string
  category_level_1: string
  category_level_2: string
  category_level_3: string
  risk_statement: string
  principal_risk_bucket: string
}

export default function RiskCatalog() {
  const [risks, setRisks] = useState<Risk[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null)
  const [formData, setFormData] = useState({
    id: "",
    category_level_1: "",
    category_level_2: "",
    category_level_3: "",
    risk_statement: "",
    principal_risk_bucket: ""
  })

  useEffect(() => {
    async function loadRisks() {
      try {
        const data = await getRisks()
        setRisks(data)
      } catch (err) {
        console.error("Failed to load risks:", err)
        setError("Failed to load risks. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadRisks()
  }, [])

  const handleAddRisk = () => {
    setFormData({ id: "", category_level_1: "", category_level_2: "", category_level_3: "", risk_statement: "", principal_risk_bucket: "" })
    setIsAddDialogOpen(true)
  }

  const handleEditRisk = (risk: Risk) => {
    setEditingRisk(risk)
    setFormData({
      id: risk.id,
      category_level_1: risk.category_level_1,
      category_level_2: risk.category_level_2,
      category_level_3: risk.category_level_3,
      risk_statement: risk.risk_statement,
      principal_risk_bucket: risk.principal_risk_bucket
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveRisk = async () => {
    try {
      if (editingRisk) {
        // Update existing risk
        await updateRisk(editingRisk.id, formData)
        setRisks(risks.map(risk => 
          risk.id === editingRisk.id 
            ? { ...formData } as Risk
            : risk
        ))
        setIsEditDialogOpen(false)
        setEditingRisk(null)
      } else {
        // Add new risk
        await addRisk(formData)
        const newRisk = { ...formData } as Risk
        setRisks([...risks, newRisk])
        setIsAddDialogOpen(false)
      }
      
      setFormData({ id: "", category_level_1: "", category_level_2: "", category_level_3: "", risk_statement: "", principal_risk_bucket: "" })
    } catch (err) {
      console.error("Failed to save risk:", err)
      setError("Failed to save risk. Please try again.")
    }
  }

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading risks...</div>
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
        <CardTitle className="text-lg font-semibold text-gray-900">Risk Catalog</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              onClick={handleAddRisk}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-sm"
            >
              <Plus className="h-3 w-3 mr-2" />
              Add Risk
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Risk</DialogTitle>
              <DialogDescription>
                Add a new risk to the catalog. Fill in the details below.
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
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category_level_1" className="text-right text-sm">
                  Category Level 1
                </Label>
                <Input
                  id="category_level_1"
                  value={formData.category_level_1}
                  onChange={(e) => handleFormChange("category_level_1", e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category_level_2" className="text-right text-sm">
                  Category Level 2
                </Label>
                <Input
                  id="category_level_2"
                  value={formData.category_level_2}
                  onChange={(e) => handleFormChange("category_level_2", e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category_level_3" className="text-right text-sm">
                  Category Level 3
                </Label>
                <Input
                  id="category_level_3"
                  value={formData.category_level_3}
                  onChange={(e) => handleFormChange("category_level_3", e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="risk_statement" className="text-right text-sm">
                  Risk Statement
                </Label>
                <Textarea
                  id="risk_statement"
                  value={formData.risk_statement}
                  onChange={(e) => handleFormChange("risk_statement", e.target.value)}
                  className="col-span-3"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="principal_risk_bucket" className="text-right text-sm">
                  Principal Risk Bucket
                </Label>
                <Input
                  id="principal_risk_bucket"
                  value={formData.principal_risk_bucket}
                  onChange={(e) => handleFormChange("principal_risk_bucket", e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={handleSaveRisk}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Save Risk
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
                <TableHead className="text-gray-700 font-medium">Category Level 1</TableHead>
                <TableHead className="text-gray-700 font-medium">Category Level 2</TableHead>
                <TableHead className="text-gray-700 font-medium">Category Level 3</TableHead>
                <TableHead className="text-gray-700 font-medium">Risk Statement</TableHead>
                <TableHead className="text-right text-gray-700 font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {risks.map((risk: Risk) => (
                <TableRow key={risk.id} className="border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">{risk.id}</TableCell>
                  <TableCell className="text-gray-700">{risk.category_level_1}</TableCell>
                  <TableCell className="text-gray-700">{risk.category_level_2 || <span className="text-gray-400">-</span>}</TableCell>
                  <TableCell className="text-gray-700">{risk.category_level_3 || <span className="text-gray-400">-</span>}</TableCell>
                  <TableCell className="text-gray-700">{risk.risk_statement}</TableCell>
                  <TableCell className="text-right">
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditRisk(risk)}
                          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Edit Risk</DialogTitle>
                          <DialogDescription>
                            Update the risk details below.
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
                            <Label htmlFor="edit-category_level_1" className="text-right text-sm">
                              Category Level 1
                            </Label>
                            <Input
                              id="edit-category_level_1"
                              value={formData.category_level_1}
                              onChange={(e) => handleFormChange("category_level_1", e.target.value)}
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-category_level_2" className="text-right text-sm">
                              Category Level 2
                            </Label>
                            <Input
                              id="edit-category_level_2"
                              value={formData.category_level_2}
                              onChange={(e) => handleFormChange("category_level_2", e.target.value)}
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-category_level_3" className="text-right text-sm">
                              Category Level 3
                            </Label>
                            <Input
                              id="edit-category_level_3"
                              value={formData.category_level_3}
                              onChange={(e) => handleFormChange("category_level_3", e.target.value)}
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-risk_statement" className="text-right text-sm">
                              Risk Statement
                            </Label>
                            <Textarea
                              id="edit-risk_statement"
                              value={formData.risk_statement}
                              onChange={(e) => handleFormChange("risk_statement", e.target.value)}
                              className="col-span-3"
                              rows={3}
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-principal_risk_bucket" className="text-right text-sm">
                              Principal Risk Bucket
                            </Label>
                            <Input
                              id="edit-principal_risk_bucket"
                              value={formData.principal_risk_bucket}
                              onChange={(e) => handleFormChange("principal_risk_bucket", e.target.value)}
                              className="col-span-3"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            type="submit" 
                            onClick={handleSaveRisk}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                          >
                            Update Risk
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {risks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No risks found. Click "Add Risk" to get started.
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
