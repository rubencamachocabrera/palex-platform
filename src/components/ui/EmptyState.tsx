/**
 * EmptyState — estado vacío reutilizable para listas y secciones sin datos.
 * Muestra una ilustración SVG, un título, una descripción opcional y un CTA.
 *
 * Uso básico:
 *   <EmptyState icon="document" title="Sin visitas" />
 *
 * Con descripción y CTA enlace:
 *   <EmptyState
 *     icon="hospital"
 *     title="No hay hospitales"
 *     description="Aún no tienes centros asignados en tu zona."
 *     action={{ label: "Ver zonas", href: "/admin/zonas" }}
 *   />
 *
 * Con CTA botón (acción):
 *   <EmptyState
 *     icon="pipeline"
 *     title="Sin oportunidades"
 *     action={{ label: "Crear oportunidad", onClick: () => abrirModal() }}
 *   />
 */

import Link from "next/link"

// ── Ilustraciones SVG ────────────────────────────────────────────────────────

function IllustrationDocument() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="72" height="72" rx="20" fill="#F3F4F6"/>
      <path d="M44 20H28a4 4 0 0 0-4 4v24a4 4 0 0 0 4 4h16a4 4 0 0 0 4-4V29l-8-9z" fill="#E5E7EB"/>
      <path d="M44 20v9h8" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinejoin="round"/>
      <line x1="30" y1="35" x2="42" y2="35" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="30" y1="40" x2="42" y2="40" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="30" y1="45" x2="38" y2="45" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IllustrationHospital() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="72" height="72" rx="20" fill="#F3F4F6"/>
      <path d="M14 52V30l22-14 22 14v22" fill="#E5E7EB"/>
      <rect x="28" y="38" width="16" height="14" rx="2" fill="#D1D5DB"/>
      <rect x="33" y="27" width="6" height="6" rx="1" fill="#D1D5DB"/>
      <line x1="36" y1="25" x2="36" y2="33" stroke="#B5B5B5" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="32" y1="29" x2="40" y2="29" stroke="#B5B5B5" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IllustrationPipeline() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="72" height="72" rx="20" fill="#F3F4F6"/>
      <rect x="14" y="40" width="12" height="14" rx="2" fill="#E5E7EB"/>
      <rect x="30" y="32" width="12" height="22" rx="2" fill="#D1D5DB"/>
      <rect x="46" y="22" width="12" height="32" rx="2" fill="#C9CACA"/>
      <polyline points="20,38 36,28 52,20" stroke="#B5B5B5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="52" cy="20" r="2.5" fill="#B5B5B5"/>
      <circle cx="56" cy="16" r="1.5" fill="#B5B5B5"/>
    </svg>
  )
}

function IllustrationSearch() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="72" height="72" rx="20" fill="#F3F4F6"/>
      <circle cx="32" cy="32" r="14" fill="#E5E7EB"/>
      <circle cx="32" cy="32" r="8" fill="#D1D5DB"/>
      <line x1="42" y1="42" x2="54" y2="54" stroke="#C4C4C4" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}

function IllustrationUsers() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="72" height="72" rx="20" fill="#F3F4F6"/>
      <circle cx="28" cy="28" r="8" fill="#E5E7EB"/>
      <path d="M12 52a16 16 0 0 1 32 0" fill="#E5E7EB"/>
      <circle cx="46" cy="26" r="6" fill="#D1D5DB"/>
      <path d="M34 52a12 12 0 0 1 24 0" fill="#D1D5DB"/>
    </svg>
  )
}

const ILLUSTRATIONS = {
  document: <IllustrationDocument />,
  hospital: <IllustrationHospital />,
  pipeline: <IllustrationPipeline />,
  search:   <IllustrationSearch />,
  users:    <IllustrationUsers />,
} as const

type IconType = keyof typeof ILLUSTRATIONS

// ── Componente ───────────────────────────────────────────────────────────────

interface EmptyStateAction {
  label: string
  href?: string
  onClick?: () => void
  variant?: "primary" | "ghost"
}

interface EmptyStateProps {
  icon?: IconType | React.ReactNode
  title: string
  description?: string
  action?: EmptyStateAction
  className?: string
}

export function EmptyState({ icon = "document", title, description, action, className = "" }: EmptyStateProps) {
  const illustration = typeof icon === "string"
    ? ILLUSTRATIONS[icon as IconType] ?? ILLUSTRATIONS.document
    : icon

  return (
    <div className={`flex flex-col items-center justify-center py-14 px-6 text-center ${className}`}>
      <div className="mb-5 opacity-90 dark:opacity-60">
        {illustration}
      </div>

      <p className="text-gray-700 font-semibold text-sm mb-1">{title}</p>
      {description && (
        <p className="text-gray-400 text-xs max-w-xs leading-relaxed">{description}</p>
      )}

      {/* CTA */}
      {action && (
        <div className="mt-5">
          {action.href ? (
            <Link
              href={action.href}
              className={
                action.variant === "ghost"
                  ? "text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                  : "inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg text-white bg-teal-500 hover:bg-teal-600 transition-colors shadow-sm"
              }
            >
              {action.label}
              {action.variant !== "ghost" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              )}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className={
                action.variant === "ghost"
                  ? "text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                  : "inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg text-white bg-teal-500 hover:bg-teal-600 transition-colors shadow-sm"
              }
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
