"use client"

import { useState, useEffect } from "react"
import { TEAL } from "@/lib/brand"
import { useToast } from "@/components/Toast"
import type { Proyecto, ModuloInfo } from "../types"

type EstadoModulo = "PENDIENTE" | "EN_INSTALACION" | "INSTALADO" | "FORMACION" | "VALIDADO"

const ESTADO_MODULO_LABEL: Record<EstadoModulo, string> = {
  PENDIENTE: "Pendiente", EN_INSTALACION: "En instalación",
  INSTALADO: "Instalado", FORMACION: "Formación", VALIDADO: "Validado",
}
const ESTADO_MODULO_COLOR: Record<EstadoModulo, string> = {
  PENDIENTE: "bg-gray-100 text-gray-500", EN_INSTALACION: "bg-blue-50 text-blue-600",
  INSTALADO: "bg-teal-50 text-teal-600", FORMACION: "bg-amber-50 text-amber-600",
  VALIDADO: "bg-emerald-50 text-emerald-600",
}

export function TabModulos({ pp, onUpdate }: { pp: Proyecto; onUpdate: (p: Proyecto) => void }) {
  const toast = useToast()
  const [editando, setEditando] = useState(false)
  const [todosModulos, setTodosModulos] = useState<ModuloInfo[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const modulos = pp.modulos ?? []

  useEffect(() => {
    fetch("/api/modulos-inlab").then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d)) setTodosModulos(d.filter((m: { activo: boolean }) => m.activo))
    })
  }, [])

  function startEdit() {
    setSelectedIds(modulos.map(m => m.modulo.id))
    setEditando(true)
  }

  function toggleModulo(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function guardar() {
    setSaving(true)
    const r = await fetch(`/api/proyectos/${pp.id}/modulos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduloIds: selectedIds }),
    })
    if (r.ok) {
      const data = await r.json()
      onUpdate({ ...pp, modulos: data })
      toast.success("Módulos actualizados")
      setEditando(false)
    } else {
      toast.error("Error al guardar módulos")
    }
    setSaving(false)
  }

  async function cambiarEstado(moduloId: string, estado: EstadoModulo) {
    const r = await fetch(`/api/proyectos/${pp.id}/modulos/${moduloId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    })
    if (r.ok) {
      const updated = await r.json()
      onUpdate({
        ...pp,
        modulos: modulos.map(m => m.modulo.id === moduloId ? { ...m, estado: updated.estado } : m),
      })
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Módulos INLAB</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {(editando ? selectedIds.length : modulos.length)} módulo{(editando ? selectedIds.length : modulos.length) !== 1 ? "s" : ""} asignado{(editando ? selectedIds.length : modulos.length) !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editando ? (
            <>
              <button onClick={() => setEditando(false)}
                className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving}
                className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: TEAL }}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </>
          ) : (
            <button onClick={startEdit}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Editar
            </button>
          )}
        </div>
      </div>

      {editando ? (
        <div className="space-y-2.5">
          {todosModulos.map(m => (
            <label key={m.id} className="flex items-center gap-3 cursor-pointer group p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <input type="checkbox" className="rounded w-4 h-4 cursor-pointer"
                style={{ accentColor: TEAL }}
                checked={selectedIds.includes(m.id)}
                onChange={() => toggleModulo(m.id)} />
              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">{m.nombre}</span>
            </label>
          ))}
          {todosModulos.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No hay módulos INLAB configurados.</p>
          )}
        </div>
      ) : modulos.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No hay módulos asignados.{" "}
          <button onClick={startEdit} className="underline cursor-pointer" style={{ color: TEAL }}>Añadir módulos</button>
        </p>
      ) : (
        <div className="space-y-2">
          {modulos.map(pm => (
            <div key={pm.modulo.id} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-gray-100 dark:border-gray-800 min-h-[52px]">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: TEAL }} />
              <span className="text-sm text-gray-800 dark:text-gray-200 flex-1 min-w-0">{pm.modulo.nombre}</span>
              <select value={pm.estado}
                onChange={e => cambiarEstado(pm.modulo.id, e.target.value as EstadoModulo)}
                className={`text-xs font-semibold px-2.5 py-2.5 rounded-lg border-0 cursor-pointer focus:outline-none focus:ring-2 shrink-0 min-h-[44px] min-w-[130px] ${ESTADO_MODULO_COLOR[pm.estado as EstadoModulo] ?? ""}`}
                style={{ ["--tw-ring-color" as string]: TEAL }}>
                {(Object.keys(ESTADO_MODULO_LABEL) as EstadoModulo[]).map(e => (
                  <option key={e} value={e}>{ESTADO_MODULO_LABEL[e]}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

