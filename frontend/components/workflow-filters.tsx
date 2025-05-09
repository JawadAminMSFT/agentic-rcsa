"use client"

import { useState, useTransition } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"

interface WorkflowFiltersProps {
  initialStatus?: string
  initialSearch?: string
}

export default function WorkflowFilters({ initialStatus = "", initialSearch = "" }: WorkflowFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState(initialStatus)
  const [search, setSearch] = useState(initialSearch)

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (status) params.set("status", status)
    if (search) params.set("search", search)

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const clearFilters = () => {
    setStatus("")
    setSearch("")
    startTransition(() => {
      router.push(pathname)
    })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search workflows..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
        />
      </div>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="active">In Progress</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Button onClick={applyFilters} disabled={isPending}>
          Apply Filters
        </Button>
        <Button variant="outline" onClick={clearFilters} disabled={isPending}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
