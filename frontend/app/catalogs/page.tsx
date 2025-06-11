"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Suspense, useState } from "react"
import RiskCatalog from "@/components/catalogs/risk-catalog"
import ControlsCatalog from "@/components/catalogs/controls-catalog"
import GuardrailsCatalog from "@/components/catalogs/guardrails-catalog"
import SamplesCatalog from "@/components/catalogs/samples-catalog"
import CatalogLoading from "@/components/catalogs/catalog-loading"
import { RefreshCw, Clock, Check, Database, Shield, FileText, History, Sparkles } from "lucide-react"

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="container mx-auto max-w-7xl space-y-8">
        {/* Enhanced Header Section */}
        <div className="relative overflow-hidden bg-white/80 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-cyan-600/5"></div>
          <div className="relative flex items-start justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
                  <Database className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-1">
                    Data Catalogs
                  </h1>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    <p className="text-gray-600 text-sm font-medium">
                      Intelligent Risk Management Platform
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 text-sm max-w-md leading-relaxed">
                Centralized repository for risk catalogs, control libraries, guardrails, and past submissions to power AI-driven risk assessments
              </p>
            </div>
            <div className="flex flex-col items-end space-y-3">
              <Button 
                onClick={handleSyncWithArcher}
                disabled={isSyncing}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync with Archer'}
              </Button>
              
              {/* Enhanced Success indicator and last synced timestamp */}
              <div className="flex items-center space-x-2">
                {showSuccess && (
                  <div className="flex items-center text-emerald-600 text-sm font-medium bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 animate-in fade-in-0 slide-in-from-top-2">
                    <Check className="h-4 w-4 mr-1" />
                    Sync completed
                  </div>
                )}
                {lastSynced && !showSuccess && (
                  <div className="flex items-center text-gray-500 text-xs bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                    <Clock className="h-3 w-3 mr-1" />
                    Last synced: {formatLastSynced(lastSynced)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs Section */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <Tabs defaultValue="risks" className="w-full">
            <div className="p-6 bg-gradient-to-r from-gray-50/50 to-blue-50/50 border-b border-gray-200/50">
              <TabsList className="bg-white/90 backdrop-blur-sm p-1.5 rounded-xl shadow-lg border border-gray-200/50">
                <TabsTrigger 
                  value="risks" 
                  className="text-sm px-6 py-3 rounded-lg font-medium transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gray-50"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Risk Catalog
                </TabsTrigger>
                <TabsTrigger 
                  value="controls" 
                  className="text-sm px-6 py-3 rounded-lg font-medium transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gray-50"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Controls Library
                </TabsTrigger>
                <TabsTrigger 
                  value="guardrails" 
                  className="text-sm px-6 py-3 rounded-lg font-medium transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gray-50"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Guardrails
                </TabsTrigger>
                <TabsTrigger 
                  value="samples" 
                  className="text-sm px-6 py-3 rounded-lg font-medium transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gray-50"
                >
                  <History className="h-4 w-4 mr-2" />
                  Past Submissions
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-8">
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
