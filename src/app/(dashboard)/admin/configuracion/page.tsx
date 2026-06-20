"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/components/Toast"
import { TEAL, ORANGE } from "@/lib/brand"
import {
  DEFAULT_SCORING_CONFIG, invalidateScoringCache,
  type ScoringConfig, type CategoriaConfig, type ReglaConfig,
} from "@/lib/scoring-config"

// ---- tipos ----

interface Config { id: number; crmActivo: boolean; scoringConfig?: ScoringConfig | null }
interface ModuloItem { id: string; nombre: string; activo: boolean; _count?: { proyectos: number } }

const NIVEL_LABEL: Record<string, string> = { alto: "Alto", medio: "Medio", info: "Info" }
const NIVEL_COLOR: Record<string, string> = { alto: "#ef4444", medio: "#f59e0b", info: "#3b82f6" }
const REGLA_LABEL: Record<string, string> = {
  "so-obsoleto": "SO incompatible (Win 7 o anterior)",
  "sin-red-cableada": "Sin red cableada",
  "sin-pet-elec": "Sin petición electrónica",
  "sin-wifi": "Sin cobertura WiFi",
  "sin-servidor": "Sin espacio para servidor",
  "sin-pcs": "Sin PCs disponibles",
  "alta-incidencias": "Alta tasa de incidencias (>5%)",
  "sin-planos": "Sin planos del área",
  "bcrobo-sin-red": "BC Robo sin toma de red",
  "bcrobo-sin-elec": "BC Robo sin toma eléctrica",
  "zebra-sin-red": "Zebras sin conectividad",
  "ldap-sin-ti": "LDAP sin contacto TI identificado",
  "bcrobo-acceso": "Acceso restringido para BC Robo",
  "etiq-sin-sistema": "Sin sistema de etiquetado definido",
  "volumen-alto-sin-estadistico": "Alto volumen sin estadístico",
}

// ---- subcomponentes ----

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: checked ? TEAL : "#d1d5db" } as React.CSSProperties}
    >
      <span
        className="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  )
}

function ModuleCard({
  title, description, activo, onToggle, saving, icon,
}: {
  title: string; description: string; activo: boolean
  onToggle: (v: boolean) => void; saving: boolean; icon: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex items-start gap-5 shadow-sm">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: activo ? `${TEAL}18` : "#f3f4f6" }}>
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
        <div className="mt-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: activo ? `${TEAL}18` : "#fef3c714", color: activo ? TEAL : ORANGE }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activo ? TEAL : ORANGE }} />
            {activo ? "Visible en la aplicación" : "Oculto para todos los usuarios"}
          </span>
        </div>
      </div>
    </div>
  )
}

// ---- sección plantillas ----

function PlantillasSection() {
  const { success, error: toastError } = useToast()
  const [items, setItems] = useState<{ id: string; nombre: string; descripcion: string | null; tipo: string; activa: boolean; creadoEn: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState("")

  useEffect(() => {
    fetch("/api/plantillas?tipo=all")
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setItems(d) })
      .finally(() => setLoading(false))
  }, [])

  async function toggleActiva(item: { id: string; activa: boolean }) {
    const r = await fetch(`/api/plantillas/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: !item.activa }),
    })
    if (r.ok) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, activa: !i.activa } : i))
      success(!item.activa ? "Plantilla activada" : "Plantilla desactivada")
    }
  }

  async function renombrar(id: string) {
    if (!editNombre.trim()) return
    const r = await fetch(`/api/plantillas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editNombre.trim() }),
    })
    if (r.ok) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, nombre: editNombre.trim() } : i))
      setEditId(null)
      success("Plantilla renombrada")
    } else {
      toastError("Error al renombrar")
    }
  }

  async function eliminar(id: string) {
    const r = await fetch(`/api/plantillas/${id}`, { method: "DELETE" })
    if (r.ok) {
      setItems(prev => prev.filter(i => i.id !== id))
      success("Plantilla eliminada")
    } else {
      toastError("Error al eliminar")
    }
  }

  const TIPO_LABEL: Record<string, string> = { PROYECTOS: "Proyectos", VENTAS: "Ventas" }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Plantillas de visita</h2>
          <p className="text-sm text-gray-500 mt-0.5">Guardadas desde el formulario de visita con el botón marcador</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400 bg-gray-50 rounded-2xl">
          <p>Sin plantillas guardadas.</p>
          <p className="text-xs mt-1">Abre una visita y usa el icono de marcador en la barra de acciones para guardar una.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipo</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} className={`border-b border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                  <td className="px-4 py-3">
                    {editId === item.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editNombre}
                          onChange={e => setEditNombre(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") renombrar(item.id); if (e.key === "Escape") setEditId(null) }}
                          className="flex-1 px-2 py-1 border border-teal-300 rounded-lg text-sm focus:outline-none"
                        />
                        <button onClick={() => renombrar(item.id)} className="text-xs font-semibold px-2 py-1 rounded-lg text-white" style={{ backgroundColor: TEAL }}>OK</button>
                        <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Cancelar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditId(item.id); setEditNombre(item.nombre) }}
                        className="text-left font-medium text-gray-900 hover:text-teal-700 transition-colors"
                      >
                        {item.nombre}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {TIPO_LABEL[item.tipo] ?? item.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: item.activa ? `${TEAL}18` : "#f3f4f6", color: item.activa ? TEAL : "#9ca3af" }}>
                      {item.activa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => toggleActiva(item)} className="text-xs text-gray-400 hover:text-gray-700 underline transition-colors">
                        {item.activa ? "Desactivar" : "Activar"}
                      </button>
                      <button onClick={() => eliminar(item.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---- Módulos InLab ----

function ModulosInlabSection() {
  const { success, error: toastError } = useToast()
  const [items, setItems] = useState<ModuloItem[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [creando, setCreando] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState("")

  useEffect(() => {
    fetch("/api/modulos-inlab?admin=1")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setItems(d) })
      .finally(() => setLoading(false))
  }, [])

  async function crear() {
    if (!nuevoNombre.trim()) return
    setCreando(true)
    try {
      const r = await fetch("/api/modulos-inlab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevoNombre.trim() }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? "Error"); }
      const nuevo = await r.json()
      setItems(prev => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setNuevoNombre("")
      success("Módulo creado")
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Error al crear")
    } finally {
      setCreando(false)
    }
  }

  async function toggleActivo(item: ModuloItem) {
    const r = await fetch(`/api/modulos-inlab/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !item.activo }),
    })
    if (r.ok) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, activo: !item.activo } : i))
      success(item.activo ? "Módulo desactivado" : "Módulo activado")
    } else {
      toastError("Error al actualizar")
    }
  }

  async function renombrar(id: string) {
    if (!editNombre.trim()) return
    const r = await fetch(`/api/modulos-inlab/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editNombre.trim() }),
    })
    if (r.ok) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, nombre: editNombre.trim() } : i))
      setEditId(null)
      success("Renombrado")
    } else {
      const d = await r.json()
      toastError(d.error ?? "Error")
    }
  }

  async function eliminar(id: string) {
    const r = await fetch(`/api/modulos-inlab/${id}`, { method: "DELETE" })
    if (r.status === 204) {
      setItems(prev => prev.filter(i => i.id !== id))
      success("Módulo eliminado")
    } else {
      const d = await r.json()
      toastError(d.error ?? "No se puede eliminar")
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Módulos InLab</h2>
          <p className="text-sm text-gray-500 mt-0.5">Módulos disponibles para asignar a proyectos</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={nuevoNombre}
          onChange={e => setNuevoNombre(e.target.value)}
          onKeyDown={e => e.key === "Enter" && crear()}
          placeholder="Nombre del módulo (ej: ALMACÉN, DISPENSACIÓN…)"
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        <button
          onClick={crear}
          disabled={creando || !nuevoNombre.trim()}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90 shrink-0"
          style={{ backgroundColor: TEAL }}
        >
          {creando ? "Creando…" : "Añadir"}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400 bg-gray-50 rounded-2xl">
          Sin módulos. Añade el primero arriba.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Proyectos</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} className={`border-b border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                  <td className="px-4 py-3">
                    {editId === item.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editNombre}
                          onChange={e => setEditNombre(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") renombrar(item.id); if (e.key === "Escape") setEditId(null) }}
                          className="flex-1 px-2 py-1 border border-teal-300 rounded-lg text-sm focus:outline-none"
                        />
                        <button onClick={() => renombrar(item.id)} className="text-xs font-semibold px-2 py-1 rounded-lg text-white" style={{ backgroundColor: TEAL }}>OK</button>
                        <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Cancelar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditId(item.id); setEditNombre(item.nombre) }}
                        className="text-left font-medium text-gray-900 hover:text-teal-700 transition-colors"
                      >
                        {item.nombre}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: item.activo ? `${TEAL}18` : "#f3f4f6", color: item.activo ? TEAL : "#9ca3af" }}>
                      {item.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">
                    {item._count?.proyectos ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => toggleActivo(item)} className="text-xs text-gray-400 hover:text-gray-700 underline transition-colors">
                        {item.activo ? "Desactivar" : "Activar"}
                      </button>
                      <button onClick={() => eliminar(item.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---- Scoring Section ----

function ScoringSection({ initialConfig }: { initialConfig: ScoringConfig }) {
  const { success, error: toastError } = useToast()
  const [cfg, setCfg] = useState<ScoringConfig>(initialConfig)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  function setCategorias(cats: CategoriaConfig[]) {
    setCfg(c => ({ ...c, categorias: cats })); setDirty(true)
  }
  function setReglas(reglas: ReglaConfig[]) {
    setCfg(c => ({ ...c, reglas })); setDirty(true)
  }
  function setUmbral(key: keyof ScoringConfig["umbrales"], val: number) {
    setCfg(c => ({ ...c, umbrales: { ...c.umbrales, [key]: val } })); setDirty(true)
  }

  async function guardar() {
    setSaving(true)
    try {
      const r = await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoringConfig: cfg }),
      })
      if (!r.ok) throw new Error()
      invalidateScoringCache()
      setDirty(false)
      success("Configuración de scoring guardada")
    } catch {
      toastError("Error al guardar el scoring")
    } finally {
      setSaving(false)
    }
  }

  function resetDefaults() {
    setCfg(DEFAULT_SCORING_CONFIG)
    setDirty(true)
  }

  const maxTotal = cfg.categorias.filter(c => c.activa).reduce((s, c) => s + c.max, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Scoring de complejidad</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Configura los pesos de cada categoría, los umbrales de nivel y qué alertas están activas.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={resetDefaults} className="text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors">
            Restaurar por defecto
          </button>
          <button
            onClick={guardar}
            disabled={saving || !dirty}
            className="text-xs font-semibold px-4 py-2 rounded-xl text-white disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: TEAL }}
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>

      {/* Umbrales de nivel */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Umbrales de nivel</h3>
        <p className="text-xs text-gray-400 mb-4">
          Define el valor máximo de score (0–100) para cada nivel de complejidad.
        </p>
        <div className="grid grid-cols-3 gap-4">
          {(["baja", "media", "alta"] as const).map(key => {
            const colors = { baja: "#10b981", media: "#f59e0b", alta: "#f97316" }
            const labels = { baja: "Baja", media: "Media", alta: "Alta (>alta = Muy alta)" }
            return (
              <div key={key}>
                <label className="text-xs font-semibold mb-1 block" style={{ color: colors[key] }}>
                  {labels[key]}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={1} max={99}
                    value={cfg.umbrales[key]}
                    onChange={e => setUmbral(key, Number(e.target.value))}
                    className="flex-1 accent-teal-500"
                  />
                  <span className="text-sm font-bold tabular-nums w-8 text-right" style={{ color: colors[key] }}>
                    {cfg.umbrales[key]}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3 bg-gray-50 rounded-lg px-3 py-2">
          Escala actual: Baja ≤{cfg.umbrales.baja} · Media ≤{cfg.umbrales.media} · Alta ≤{cfg.umbrales.alta} · Muy alta &gt;{cfg.umbrales.alta}
        </p>
      </div>

      {/* Pesos de categorías */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-700">Pesos por categoría</h3>
          <span className="text-xs text-gray-400">Máx. posible: <span className="font-bold text-gray-600">{maxTotal} pts</span></span>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Ajusta cuántos puntos puede aportar cada categoría al score total. El score final se normaliza a 0-100.
        </p>
        <div className="space-y-4">
          {cfg.categorias.map((cat, i) => (
            <div key={cat.id} className={`rounded-xl border p-4 transition-colors ${cat.activa ? "border-gray-100 bg-white" : "border-gray-100 bg-gray-50 opacity-60"}`}>
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => setCategorias(cfg.categorias.map((c, j) => j === i ? { ...c, activa: !c.activa } : c))}
                  className="shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors"
                  style={cat.activa ? { borderColor: TEAL, backgroundColor: `${TEAL}15` } : { borderColor: "#e5e7eb" }}
                >
                  {cat.activa && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </button>
                <span className="text-sm font-medium text-gray-700 flex-1">{cat.nombre}</span>
                <span className="text-lg font-bold tabular-nums w-10 text-right" style={{ color: cat.activa ? TEAL : "#d1d5db" }}>
                  {cat.max}
                </span>
              </div>
              {cat.activa && (
                <input
                  type="range" min={1} max={40}
                  value={cat.max}
                  onChange={e => setCategorias(cfg.categorias.map((c, j) => j === i ? { ...c, max: Number(e.target.value) } : c))}
                  className="w-full accent-teal-500"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Reglas de alerta */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Reglas de alerta</h3>
        <p className="text-xs text-gray-400 mb-4">
          Activa o desactiva cada regla y ajusta su nivel de gravedad.
        </p>
        <div className="space-y-2">
          {cfg.reglas.map((regla, i) => (
            <div key={regla.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${regla.activa ? "border-gray-100" : "border-gray-100 bg-gray-50 opacity-60"}`}>
              <button
                onClick={() => setReglas(cfg.reglas.map((r, j) => j === i ? { ...r, activa: !r.activa } : r))}
                className="shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors"
                style={regla.activa ? { borderColor: TEAL, backgroundColor: `${TEAL}15` } : { borderColor: "#e5e7eb" }}
              >
                {regla.activa && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </button>
              <span className="flex-1 text-xs text-gray-700">{REGLA_LABEL[regla.id] ?? regla.id}</span>
              {regla.activa && (
                <select
                  value={regla.nivel}
                  onChange={e => setReglas(cfg.reglas.map((r, j) => j === i ? { ...r, nivel: e.target.value as "alto" | "medio" | "info" } : r))}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
                  style={{ color: NIVEL_COLOR[regla.nivel] }}
                >
                  {(["alto", "medio", "info"] as const).map(n => (
                    <option key={n} value={n}>{NIVEL_LABEL[n]}</option>
                  ))}
                </select>
              )}
              {!regla.activa && (
                <span className="text-xs text-gray-400 px-2 py-0.5 rounded-full bg-gray-100">Inactiva</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---- página principal ----

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
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-500 mt-1 text-sm">Módulos y ajustes de la plataforma.</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-4">
            <ModuleCard
              title="Módulo CRM — Pipeline de Ventas"
              description="Pipeline Kanban, oportunidades comerciales y mapa de cobertura. Visible para roles ADMIN y VENTAS."
              activo={config?.crmActivo ?? true}
              onToggle={toggleCRM}
              saving={saving}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              }
            />
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm text-gray-500">
              <p className="font-medium text-gray-700 mb-1">Sobre los módulos</p>
              <p>Los módulos desactivados dejan de aparecer en la barra lateral y sus rutas redirigen al dashboard. Los datos no se eliminan.</p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100" />

      <PlantillasSection />

      <div className="border-t border-gray-100" />

      <ModulosInlabSection />

      <div className="border-t border-gray-100" />

      {!loading && (
        <ScoringSection
          initialConfig={
            config?.scoringConfig
              ? { ...DEFAULT_SCORING_CONFIG, ...(config.scoringConfig as Partial<ScoringConfig>) }
              : DEFAULT_SCORING_CONFIG
          }
        />
      )}
    </div>
  )
}
