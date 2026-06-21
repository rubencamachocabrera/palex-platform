import { Skeleton } from "@/components/ui/Skeleton"

export default function MapaLoading() {
  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 flex flex-col animate-in fade-in duration-300" style={{ height: "calc(100vh - 56px)" }}>
      {/* Title bar */}
      <div className="shrink-0 px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4">
        <div className="flex items-center gap-3 mr-auto">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-2.5 w-28" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>
      </div>

      {/* Map placeholder */}
      <div className="flex-1 min-h-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Skeleton className="h-12 w-12 rounded-xl mx-auto" />
          <Skeleton className="h-3 w-32 mx-auto" />
        </div>
      </div>
    </div>
  )
}
