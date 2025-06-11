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
import { getRisks, addRisk, updateRisk } from "@/lib/api-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Plus, Edit, Shield, TrendingUp, Layers, Sparkles } from "lucide-react"

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
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-sm font-medium">Loading risk catalog...</span>
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
    <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-red-50/20 to-orange-50/30 backdrop-blur-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-red-50/50 via-orange-50/30 to-red-50/50 border-b border-red-100/50 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                Risk Catalog
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <TrendingUp className="h-4 w-4 text-red-500" />
                <span className="text-sm text-gray-600 font-medium">
                  {risks.length} risks identified
                </span>
              </div>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="lg" 
                onClick={handleAddRisk}
                className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Risk
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white/95 backdrop-blur-lg border border-white/20 shadow-2xl">
              <DialogHeader className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white">
                    <Plus className="h-5 w-5" />
                  </div>
                  <DialogTitle className="text-xl font-semibold">Add New Risk</DialogTitle>
                </div>
                <DialogDescription className="text-gray-600 leading-relaxed">
                  Add a new risk to the catalog. Fill in the details below to enhance the risk assessment database.
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
                  className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white"
                >
                  Save Risk
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
              <TableRow className="bg-gradient-to-r from-gray-50 to-red-50/30 border-gray-200/50 hover:bg-gray-50/80">
                <TableHead className="text-gray-800 font-semibold py-4 px-6">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-red-500" />
                    ID
                  </div>
                </TableHead>
                <TableHead className="text-gray-800 font-semibold py-4">Category Level 1</TableHead>
                <TableHead className="text-gray-800 font-semibold py-4">Category Level 2</TableHead>
                <TableHead className="text-gray-800 font-semibold py-4">Category Level 3</TableHead>
                <TableHead className="text-gray-800 font-semibold py-4">Risk Statement</TableHead>
                <TableHead className="text-right text-gray-800 font-semibold py-4 pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {risks.map((risk: Risk, index: number) => (
                <TableRow 
                  key={risk.id} 
                  className="border-gray-200/50 hover:bg-gradient-to-r hover:from-red-50/30 hover:to-orange-50/20 transition-all duration-300 group"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <TableCell className="font-bold text-red-700 py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-red-400 to-orange-400 rounded-full"></div>
                      {risk.id}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-700 font-medium py-4">{risk.category_level_1}</TableCell>
                  <TableCell className="text-gray-700 py-4">
                    {risk.category_level_2 || <span className="text-gray-400 italic">Not specified</span>}
                  </TableCell>
                  <TableCell className="text-gray-700 py-4">
                    {risk.category_level_3 || <span className="text-gray-400 italic">Not specified</span>}
                  </TableCell>
                  <TableCell className="text-gray-700 py-4 max-w-md">
                    <div className="truncate" title={risk.risk_statement}>
                      {risk.risk_statement}
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-4 pr-6">
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditRisk(risk)}
                          className="text-gray-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px] bg-white/95 backdrop-blur-lg border border-white/20 shadow-2xl">
                        <DialogHeader className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white">
                              <Edit className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-xl font-semibold">Edit Risk</DialogTitle>
                          </div>
                          <DialogDescription className="text-gray-600 leading-relaxed">
                            Update the risk details below to keep the catalog up-to-date.
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
                            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white"
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
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 rounded-full bg-gray-100">
                        <Shield className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">No risks found</h3>
                        <p className="text-gray-500 text-sm">Click "Add Risk" to get started with your risk catalog.</p>
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
