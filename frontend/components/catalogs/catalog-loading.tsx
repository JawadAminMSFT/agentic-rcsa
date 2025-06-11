import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Sparkles } from "lucide-react"

interface CatalogLoadingProps {
  title: string
}

export default function CatalogLoading({ title }: CatalogLoadingProps) {
  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-sm">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <CardTitle className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 text-blue-600">
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span className="text-sm font-medium">Loading...</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enhanced header skeleton */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-xl border border-gray-200/50">
          <Skeleton className="h-8 w-48 bg-gradient-to-r from-gray-200 to-gray-300" />
          <Skeleton className="h-10 w-32 bg-gradient-to-r from-blue-200 to-purple-200 rounded-lg" />
        </div>
        
        {/* Enhanced table skeleton */}
        <div className="space-y-3">
          {/* Table header */}
          <div className="grid grid-cols-5 gap-4 p-3 bg-gray-50/80 rounded-lg border border-gray-200/50">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={`header-${i}`} className="h-6 bg-gradient-to-r from-gray-200 to-gray-300" />
            ))}
          </div>
          
          {/* Table rows */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={`row-${i}`} className="grid grid-cols-5 gap-4 p-4 bg-white rounded-lg border border-gray-100 hover:bg-gray-50/50 transition-colors duration-300">
              {[1, 2, 3, 4, 5].map((j) => (
                <Skeleton 
                  key={`cell-${i}-${j}`} 
                  className={`h-5 bg-gradient-to-r from-gray-200 to-gray-300 ${
                    j === 1 ? 'w-16' : j === 5 ? 'w-20' : 'w-full'
                  }`}
                  style={{
                    animationDelay: `${(i * 0.1) + (j * 0.05)}s`
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        
        {/* Loading indicator */}
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-gray-500">
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <span className="text-sm font-medium">Preparing {title.toLowerCase()}...</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
