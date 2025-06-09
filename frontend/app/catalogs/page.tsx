"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Suspense, useState } from "react"
import RiskCatalog from "@/components/catalogs/risk-catalog"
import ControlsCatalog from "@/components/catalogs/controls-catalog"
import GuardrailsCatalog from "@/components/catalogs/guardrails-catalog"
import SamplesCatalog from "@/components/catalogs/samples-catalog"
import CatalogLoading from "@/components/catalogs/catalog-loading"
import { RefreshCw, Clock, Check } from "lucide-react"

export default function CatalogsPage() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSyncWithArcher = async () => {
    setIsSyncing(true)
    setShowSuccess(false)
    // Simulate sync operation
    setTimeout(() => {
      setIsSyncing(false)
      setLastSynced(new Date())
      setShowSuccess(true)
      // Hide success indicator after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000)
    }, 2000)
  }

  const formatLastSynced = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="container mx-auto max-w-7xl space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                Data Catalogs
              </h1>
              <p className="text-gray-600 text-sm">
                Manage risk, control, and guardrail catalogs for risk assessments
              </p>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Button 
                onClick={handleSyncWithArcher}
                disabled={isSyncing}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync with Archer'}
              </Button>
              
              {/* Success indicator and last synced timestamp */}
              <div className="flex items-center space-x-2">
                {showSuccess && (
                  <div className="flex items-center text-green-600 text-sm">
                    <Check className="h-4 w-4 mr-1" />
                    Sync completed
                  </div>
                )}
                {lastSynced && !showSuccess && (
                  <div className="flex items-center text-gray-500 text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Last synced: {formatLastSynced(lastSynced)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <Tabs defaultValue="risks" className="w-full">
            <div className="p-4 border-b border-gray-200">
              <TabsList className="bg-gray-100 p-1 rounded-md">
                <TabsTrigger 
                  value="risks" 
                  className="text-sm px-4 py-2 rounded-sm data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                >
                  Risk Catalog
                </TabsTrigger>
                <TabsTrigger 
                  value="controls" 
                  className="text-sm px-4 py-2 rounded-sm data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                >
                  Controls Library
                </TabsTrigger>
                <TabsTrigger 
                  value="guardrails" 
                  className="text-sm px-4 py-2 rounded-sm data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                >
                  Guardrails
                </TabsTrigger>
                <TabsTrigger 
                  value="samples" 
                  className="text-sm px-4 py-2 rounded-sm data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                >
                  Past Submissions
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="risks" className="mt-0">
                <Suspense fallback={<CatalogLoading title="Risks" />}>
                  <RiskCatalog />
                </Suspense>
              </TabsContent>

              <TabsContent value="controls" className="mt-0">
                <Suspense fallback={<CatalogLoading title="Controls" />}>
                  <ControlsCatalog />
                </Suspense>
              </TabsContent>

              <TabsContent value="guardrails" className="mt-0">
                <Suspense fallback={<CatalogLoading title="Guardrails" />}>
                  <GuardrailsCatalog />
                </Suspense>
              </TabsContent>

              <TabsContent value="samples" className="mt-0">
                <Suspense fallback={<CatalogLoading title="Past Submissions" />}>
                  <SamplesCatalog />
                </Suspense>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
