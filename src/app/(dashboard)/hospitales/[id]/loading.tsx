import { Skeleton, SkeletonKPI, SkeletonRow } from "@/components/ui/Skeleton"

export default function HospitalDetalleLoading() {
  return (
    <div className="p-6 sm:p-10 space-y-6 animate-in fade-in duration-300">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonKPI key={i} />
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-xl" />
        ))}
      </div>

      {/* Contenido tab */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b border-gray-50 last:border-0">
            <SkeletonRow />
          </div>
        ))}
      </div>
    </div>
  )
}
