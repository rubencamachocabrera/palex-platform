import { Skeleton, SkeletonFormSection } from "@/components/ui/Skeleton"

export default function VisitaLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 animate-in fade-in duration-300">
      {/* Header fijo */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 sm:px-8 py-4 flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        <Skeleton className="hidden sm:block h-8 w-28 rounded-xl" />
      </div>

      {/* Selector de sección */}
      <div className="px-4 sm:px-8 py-4">
        <Skeleton className="h-12 w-full sm:w-72 rounded-xl" />
      </div>

      {/* Barra de progreso */}
      <div className="px-4 sm:px-8 mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>

      {/* Sección del formulario */}
      <div className="px-4 sm:px-8 pb-32">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <SkeletonFormSection />
          <div className="border-t border-gray-50 px-6 pb-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>

      {/* Barra inferior móvil */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3 sm:hidden">
        <Skeleton className="flex-1 h-11 rounded-xl" />
        <Skeleton className="h-11 w-24 rounded-xl" />
      </div>
    </div>
  )
}
