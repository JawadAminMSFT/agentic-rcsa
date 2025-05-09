"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getGuardrails } from "@/lib/api-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function GuardrailsCatalog() {
  const [guardrails, setGuardrails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

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

  if (loading) {
    return <div>Loading guardrails...</div>
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Guardrails</CardTitle>
        <Button size="sm">Add Guardrail</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guardrails.map((guardrail: any) => (
              <TableRow key={guardrail.ruleId}>
                <TableCell className="font-medium">{guardrail.ruleId}</TableCell>
                <TableCell>{guardrail.description}</TableCell>
                <TableCell>
                  <SeverityBadge severity={guardrail.severity} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {guardrails.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                  No guardrails found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
