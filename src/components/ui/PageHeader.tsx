/**
 * PageHeader — cabecera reutilizable para todas las páginas del dashboard.
 * Garantiza coherencia visual: mismo espaciado, jerarquía y posición de acciones.
 *
 * Uso básico:
 *   <PageHeader title="Mis visitas" subtitle="24 visitas en total" />
 *
 * Con acciones a la derecha:
 *   <PageHeader title="Hospitales" actions={<button>Exportar</button>} />
 *
 * Con breadcrumb:
 *   <PageHeader title="Hospital X" breadcrumb={[{ label: "Hospitales", href: "/hospitales" }]} />
 */

import Link from "next/link"

interface BreadcrumbItem {
  label: string
  href: string
}

interface PageHeaderProps {
  title: string
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  breadcrumb?: BreadcrumbItem[]
  className?: string
}

export function PageHeader({ title, subtitle, actions, breadcrumb, className = "" }: PageHeaderProps) {
  return (
    <div className={`mb-6 ${className}`}>
      {/* Breadcrumb opcional */}
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1.5 mb-2">
          {breadcrumb.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <Link
                href={item.href}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {item.label}
              </Link>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </span>
          ))}
        </nav>
      )}

      {/* Fila principal: título + acciones */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
