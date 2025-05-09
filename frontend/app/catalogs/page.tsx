import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Suspense } from "react"
import RiskCatalog from "@/components/catalogs/risk-catalog"
import ControlsCatalog from "@/components/catalogs/controls-catalog"
import GuardrailsCatalog from "@/components/catalogs/guardrails-catalog"
import SamplesCatalog from "@/components/catalogs/samples-catalog"
import CatalogLoading from "@/components/catalogs/catalog-loading"

export default function CatalogsPage() {
  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Data Catalogs</h1>
          <p className="text-muted-foreground">Manage risk, control, and guardrail catalogs</p>
        </div>

        <Tabs defaultValue="risks" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="risks">Risk Catalog</TabsTrigger>
            <TabsTrigger value="controls">Controls Catalog</TabsTrigger>
            <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
            <TabsTrigger value="samples">Sample Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="risks">
            <Suspense fallback={<CatalogLoading title="Risks" />}>
              <RiskCatalog />
            </Suspense>
          </TabsContent>

          <TabsContent value="controls">
            <Suspense fallback={<CatalogLoading title="Controls" />}>
              <ControlsCatalog />
            </Suspense>
          </TabsContent>

          <TabsContent value="guardrails">
            <Suspense fallback={<CatalogLoading title="Guardrails" />}>
              <GuardrailsCatalog />
            </Suspense>
          </TabsContent>

          <TabsContent value="samples">
            <Suspense fallback={<CatalogLoading title="Sample Submissions" />}>
              <SamplesCatalog />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
