"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export default function MainNav() {
  const pathname = usePathname()

  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="container mx-auto py-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            >
              Operational Risk Management
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className={cn(
                  "text-sm font-medium transition-all duration-300 hover:text-blue-600 hover:scale-105 px-3 py-2 rounded-lg",
                  pathname === "/dashboard"
                    ? "text-blue-600 bg-blue-50 shadow-sm"
                    : "text-gray-700 hover:bg-white/50",
                )}
              >
                Dashboard
              </Link>
              <Link
                href="/workflows"
                className={cn(
                  "text-sm font-medium transition-all duration-300 hover:text-blue-600 hover:scale-105 px-3 py-2 rounded-lg",
                  pathname === "/workflows" || pathname.startsWith("/workflows/")
                    ? "text-blue-600 bg-blue-50 shadow-sm"
                    : "text-gray-700 hover:bg-white/50",
                )}
              >
                Workflows
              </Link>
              <Link
                href="/catalogs"
                className={cn(
                  "text-sm font-medium transition-all duration-300 hover:text-blue-600 hover:scale-105 px-3 py-2 rounded-lg",
                  pathname === "/catalogs"
                    ? "text-blue-600 bg-blue-50 shadow-sm"
                    : "text-gray-700 hover:bg-white/50",
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
