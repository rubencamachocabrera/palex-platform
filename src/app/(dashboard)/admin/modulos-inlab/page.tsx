"use client"

import { useEffect, useRef, useState } from "react"
import { useToast } from "@/components/Toast"
import { TEAL, ORANGE } from "@/lib/brand"
import { SkeletonRow } from "@/components/ui/Skeleton"
import { PageHeader } from "@/components/ui/PageHeader"

interface Modulo {
  id: string
  nombre: string
  activo: boolean
  _count: { proyectos: number }
}

export default function ModulosInlabPage() {
  const { success, error: toastError } = useToast()
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [formError, setFormError] = useState("")

  const [renameModal, setRenameModal] = useState<Modulo | null>(null)
  const [renameNombre, setRenameNombre] = useState("")
  const [renameGuardando, setRenameGuardando] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  async function cargar() {
    const r = await fetch("/api/modulos-inlab?admin=1")
    const d = await r.json()
    if (Array.isArray(d)) setModulos(d)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])
  useEffect(() => { if (mostrarForm) setTimeout(() => inputRef.current?.focus(), 50) }, [mostrarForm])

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    if (!nuevoNombre.trim()) return
    setGuardando(true)
    setFormError("")
    const r = await fetch("/api/modulos-inlab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoNombre }),
    })
    if (!r.ok) {
      const d = await r.json()
      setFormError(d.error ?? "Error al crear el módulo")
    } else {
      setNuevoNombre("")
      setMostrarForm(false)
      success("Módulo creado")
      await cargar()
    }
    setGuardando(false)
  }

  async function toggleActivo(m: Modulo) {
    const r = await fetch(`/api/modulos-inlab/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !m.activo }),
    })
    if (r.ok) {
      success(m.activo ? "Módulo desactivado" : "Módulo activado")
      await cargar()
    }
  }

  async function eliminar(m: Modulo) {
    const r = await fetch(`/api/modulos-inlab/${m.id}`, { method: "DELETE" })
    if (!r.ok) {
      const d = await r.json()
      toastError(d.error ?? "No se pudo eliminar el módulo")
    } else {
      success("Módulo eliminado")
      await cargar()
    }
  }

  async function renombrar() {
    if (!renameModal || !renameNombre.trim()) return
    setRenameGuardando(true)
    const r = await fetch(`/api/modulos-inlab/${renameModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: renameNombre }),
    })
    if (!r.ok) {
      const d = await r.json()
      toastError(d.error ?? "Error al renombrar")
    } else {
      success("Módulo renombrado")
      setRenameModal(null)
      await cargar()
    }
    setRenameGuardando(false)
  }

  return (
    <div>
      <PageHeader
        title="Módulos INLAB"
        subtitle={`${modulos.length} módulo${modulos.length !== 1 ? "s" : ""} definido${modulos.length !== 1 ? "s" : ""}`}
        actions={
          <button
            onClick={() => { setMostrarForm(v => !v); setFormError("") }}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: ORANGE }}
          >
            {mostrarForm ? "Cancelar" : "+ Nuevo módulo"}
          </button>
        }
      />

      {/* Formulario nuevo módulo */}
      {mostrarForm && (
        <form
          onSubmit={crear}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6 flex flex-col sm:flex-row gap-3 items-start sm:items-end"
        >
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Nombre del módulo
            </label>
            <input
              ref={inputRef}
              required
              value={nuevoNombre}
              onChange={e => setNuevoNombre(e.target.value)}
              placeholder="Ej: Sistema de Gestión de Peticiones Analíticas"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2"
              style={{ ["--tw-ring-color" as string]: TEAL }}
            />
            {formError && <p className="text-xs text-red-500 mt-1">{formError}</p>}
          </div>
          <button
            type="submit"
            disabled={guardando || !nuevoNombre.trim()}
            className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 shrink-0 w-full sm:w-auto"
            style={{ backgroundColor: ORANGE }}
          >
            {guardando ? "Creando..." : "Crear módulo"}
          </button>
        </form>
      )}

      {/* Lista */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
          </div>
        ) : modulos.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-gray-500 mb-1">Sin módulos definidos</p>
            <p className="text-xs text-gray-400">Crea el primer módulo con el botón de arriba.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <tr>
                  {["Módulo", "Proyectos", "Estado", "Acciones"].map(h => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {modulos.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-800 dark:text-gray-100">
                      <span
                        title={m.nombre}
                        className="block max-w-[260px] truncate"
                      >
                        {m.nombre}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {m._count.proyectos > 0 ? (
                        <span className="font-medium text-gray-700">
                          {m._count.proyectos} proyecto{m._count.proyectos !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-gray-400">Sin proyectos</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          m.activo
                            ? "bg-green-50 text-green-600"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {m.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => { setRenameModal(m); setRenameNombre(m.nombre) }}
                          className="text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          Renombrar
                        </button>
                        <button
                          onClick={() => toggleActivo(m)}
                          className={`text-xs font-medium transition-colors ${
                            m.activo
                              ? "text-amber-400 hover:text-amber-600"
                              : "text-green-500 hover:text-green-700"
                          }`}
                        >
                          {m.activo ? "Desactivar" : "Activar"}
                        </button>
                        {m._count.proyectos === 0 && (
                          <button
                            onClick={() => eliminar(m)}
                            className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal renombrar */}
      {renameModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setRenameModal(null) }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Renombrar módulo</h2>
            <p className="text-xs text-gray-400 mb-4 truncate">{renameModal.nombre}</p>
            <input
              autoFocus
              value={renameNombre}
              onChange={e => setRenameNombre(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") renombrar(); if (e.key === "Escape") setRenameModal(null) }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 mb-5"
              style={{ ["--tw-ring-color" as string]: TEAL }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRenameModal(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={renombrar}
                disabled={renameGuardando || !renameNombre.trim() || renameNombre.trim() === renameModal.nombre}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ backgroundColor: ORANGE }}
              >
                {renameGuardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
