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
import { TEAL } from "@/lib/brand"

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
  /** Icono opcional en badge de color antes del título (ej. secciones admin). */
  icon?: React.ReactNode
  /** Color de fondo del badge de icono. Por defecto TEAL vía CSS var. */
  iconColor?: string
}

export function PageHeader({ title, subtitle, actions, breadcrumb, className = "", icon, iconColor }: PageHeaderProps) {
  return (
    <header className={`page-header mb-7 sm:mb-8 ${className}`}>
      {/* Breadcrumb opcional */}
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1.5 mb-3" aria-label="Migas de pan">
          {breadcrumb.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <Link
                href={item.href}
                className="text-xs font-medium text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
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
      <div className="page-header-content flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex items-start gap-3.5">
          {icon && (
            <span
              className="page-header-icon w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 mt-0.5"
              style={{ background: `linear-gradient(145deg, ${iconColor ?? TEAL}, ${iconColor ?? TEAL}cc)` }}
            >
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-[27px] sm:text-[31px] leading-[1.1] font-extrabold tracking-[-0.04em] text-gray-900 dark:text-white truncate">{title}</h1>
            {subtitle && (
              <p className="max-w-3xl text-sm leading-6 text-gray-500 dark:text-slate-400 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}
