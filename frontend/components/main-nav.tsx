"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export default function MainNav() {
  const pathname = usePathname()

  return (
    <header className="border-b">
      <div className="container mx-auto py-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold">
              Operational Risk Management
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === "/dashboard" ? "text-primary" : "text-muted-foreground",
                )}
              >
                Dashboard
              </Link>
              <Link
                href="/workflows"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === "/workflows" || pathname.startsWith("/workflows/")
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              >
                Workflows
              </Link>
              <Link
                href="/catalogs"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === "/catalogs" ? "text-primary" : "text-muted-foreground",
                )}
              >
                Data Catalogs
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}
