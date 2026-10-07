function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ")
}

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-md skeleton-shimmer",
        className
      )}
    />
  )
}

// ─── Skeletons compuestos ────────────────────────────────────────────────────

export function SkeletonCard() {
  return (
    <div className="card rounded-2xl p-5 space-y-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3 px-4">
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  )
}

export function SkeletonKPI() {
  return (
    <div className="card rounded-2xl p-5">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-8 w-14" />
    </div>
  )
}

export function SkeletonFormSection() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-5 w-1/3" />
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  )
}

/** Cabecera de página en carga: misma silueta que PageHeader (evita salto de layout). */
export function SkeletonHeader({ actions = 1 }: { actions?: number }) {
  return (
    <div className="page-header-content mb-7 sm:mb-8 flex items-start justify-between gap-4" aria-hidden="true">
      <div className="space-y-2.5 flex-1">
        <Skeleton className="h-2.5 w-36 rounded-full" />
        <Skeleton className="h-8 w-56 rounded-lg" />
        <Skeleton className="h-3 w-72 max-w-full rounded-full" />
      </div>
      <div className="hidden sm:flex gap-2">
        {Array.from({ length: actions }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

/**
 * NexusLoader — indicador de carga de marca para transiciones de ruta:
 * órbita con núcleo teal + etiqueta mono. Anunciado a lectores de pantalla.
 */
export function NexusLoader({ label = "Cargando" }: { label?: string }) {
  return (
    <div className="nexus-loader" role="status" aria-live="polite">
      <span className="nexus-loader-orbit" aria-hidden="true">
        <span className="nexus-loader-core" />
      </span>
      <span className="nexus-loader-label">{label}</span>
    </div>
  )
}
