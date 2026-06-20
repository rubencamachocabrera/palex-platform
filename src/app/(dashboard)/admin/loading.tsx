import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton"

export default function AdminLoading() {
  return (
    <div className="p-6 sm:p-10 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-52" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-xl" />
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-56 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
        <div className="ml-auto">
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-b border-gray-50 last:border-0">
            <SkeletonRow />
          </div>
        ))}
      </div>
    </div>
  )
}
