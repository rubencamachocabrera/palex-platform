"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/components/Toast"
import { TEAL, ORANGE } from "@/lib/brand"

interface Config { id: number; crmActivo: boolean }

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: checked ? TEAL : "#d1d5db", focusRingColor: TEAL } as React.CSSProperties}
    >
      <span
        className="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  )
}

function ModuleCard({
  title,
  description,
  activo,
  onToggle,
  saving,
  icon,
}: {
  title: string
  description: string
  activo: boolean
  onToggle: (v: boolean) => void
  saving: boolean
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-start gap-5 shadow-sm">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: activo ? `${TEAL}18` : "#f3f4f6" }}
      >
        <span style={{ color: activo ? TEAL : "#9ca3af" }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm font-medium" style={{ color: activo ? TEAL : "#9ca3af" }}>
              {activo ? "Activo" : "Inactivo"}
            </span>
            <ToggleSwitch checked={activo} onChange={onToggle} disabled={saving} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: activo ? `${TEAL}18` : "#fef3c714",
              color: activo ? TEAL : ORANGE,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: activo ? TEAL : ORANGE }}
            />
            {activo ? "Visible en la aplicación" : "Oculto para todos los usuarios"}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function ConfiguracionPage() {
  const { success, error: toastError } = useToast()
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then(setConfig)
      .finally(() => setLoading(false))
  }, [])

  async function toggleCRM(valor: boolean) {
    if (!config) return
    setSaving(true)
    try {
      const r = await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crmActivo: valor }),
      })
      if (!r.ok) throw new Error()
      setConfig(prev => prev ? { ...prev, crmActivo: valor } : prev)
      success(valor ? "CRM activado correctamente" : "CRM desactivado correctamente")
    } catch {
      toastError("Error al guardar la configuración")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuración de Módulos</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Activa o desactiva módulos de la plataforma. Los cambios son instantáneos.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* CRM Module */}
          <ModuleCard
            title="Módulo CRM — Pipeline de Ventas"
            description="Pipeline Kanban, oportunidades comerciales y mapa de cobertura. Visible para roles ADMIN y VENTAS."
            activo={config?.crmActivo ?? true}
            onToggle={toggleCRM}
            saving={saving}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            }
          />

          {/* Info card */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm text-gray-500">
            <p className="font-medium text-gray-700 mb-1">Sobre los módulos</p>
            <p>Los módulos desactivados dejan de aparecer en la barra lateral y sus rutas redirigen al dashboard. Los datos no se eliminan y se pueden restaurar en cualquier momento.</p>
          </div>
        </div>
      )}
    </div>
  )
}
