import { Skeleton, SkeletonHeader, SkeletonKPI, NexusLoader } from "@/components/ui/Skeleton"

export default function DashboardGroupLoading() {
  return (
    <div className="max-w-7xl mx-auto">
      <SkeletonHeader actions={2} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonKPI key={i} />
        ))}
      </div>

      <div className="card rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <Skeleton className="h-4 w-40 rounded-full" />
          <NexusLoader />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5" style={{ opacity: 1 - i * 0.12 }}>
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/3 rounded-full" />
                <Skeleton className="h-3 w-1/4 rounded-full" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
