import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"

/**
 * Estado mostrado al acceder por URL a una seccion desactivada desde
 * Admin → Configuracion. Server-safe (sin hooks). Los datos no se borran.
 */
export function SeccionDesactivada({ titulo }: { titulo: string }) {
  return (
    <div>
      <PageHeader title={titulo} />
      <div className="card">
        <EmptyState
          title="Sección desactivada por el administrador"
          description="Esta sección está oculta temporalmente. Los datos se conservan y volverán a estar disponibles cuando un administrador la reactive."
          action={{ label: "Volver al dashboard", href: "/dashboard" }}
        />
      </div>
    </div>
  )
}
