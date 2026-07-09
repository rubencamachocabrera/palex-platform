"use client"

import { useState, useEffect } from "react"
import { TEAL } from "@/lib/brand"
import { useToast } from "@/components/Toast"
import type { Proyecto, Contacto } from "../types"

const CONTACTO_FORM_EMPTY = { nombre: "", cargo: "", email: "", telefono: "" }

export function TabContactos({ pp, onUpdate }: { pp: Proyecto; onUpdate: (p: Proyecto) => void }) {
  const { success, error: toastError } = useToast()
  const [contactosHospital, setContactosHospital] = useState<Contacto[]>([])
  const [guardando, setGuardando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(CONTACTO_FORM_EMPTY)
  const linked = new Set(pp.contactos.map(c => c.contacto.id))

  useEffect(() => {
    fetch(`/api/hospitales/${pp.hospital.id}/contactos`).then(r => r.json()).then(data => {
      setContactosHospital(Array.isArray(data) ? data : [])
    })
  }, [pp.hospital.id])

  async function vincular(c: Contacto) {
    setGuardando(true)
    try {
      await fetch(`/api/proyectos/${pp.id}/contactos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactoId: c.id }),
      })
      onUpdate({ ...pp, contactos: [...pp.contactos, { contacto: c }] })
      success("Contacto vinculado")
    } catch {
      toastError("Error")
    } finally {
      setGuardando(false)
    }
  }

  async function desvincular(contactoId: string) {
    if (!confirm("¿Desvincular este contacto del proyecto?")) return
    try {
      await fetch(`/api/proyectos/${pp.id}/contactos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactoId }),
      })
      onUpdate({ ...pp, contactos: pp.contactos.filter(c => c.contacto.id !== contactoId) })
      success("Contacto desvinculado")
    } catch {
      toastError("Error")
    }
  }

  async function setPrincipal(contactoId: string, isPrincipal: boolean) {
    try {
      const r = await fetch(`/api/hospitales/${pp.hospital.id}/contactos/${contactoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ principal: isPrincipal }),
      })
      if (!r.ok) throw new Error()
      onUpdate({
        ...pp,
        contactos: pp.contactos.map(({ contacto: c }) => ({
          contacto: { ...c, principal: c.id === contactoId ? isPrincipal : (isPrincipal ? false : c.principal) },
        })),
      })
      success(isPrincipal ? "Marcado como principal" : "Principal eliminado")
    } catch { toastError("Error") }
  }

  async function crearYVincular(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setGuardando(true)
    try {
      // 1. Crear el contacto en el hospital
      const r1 = await fetch(`/api/hospitales/${pp.hospital.id}/contactos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          cargo: form.cargo.trim() || null,
          email: form.email.trim() || null,
          telefono: form.telefono.trim() || null,
        }),
      })
      if (!r1.ok) { const d = await r1.json(); throw new Error(d.error ?? "Error al crear contacto") }
      const nuevoContacto: Contacto = await r1.json()

      // 2. Vincular al proyecto
      await fetch(`/api/proyectos/${pp.id}/contactos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactoId: nuevoContacto.id }),
      })

      setContactosHospital(prev => [...prev, nuevoContacto])
      onUpdate({ ...pp, contactos: [...pp.contactos, { contacto: nuevoContacto }] })
      setForm(CONTACTO_FORM_EMPTY)
      setMostrarForm(false)
      success("Contacto creado y vinculado")
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Error")
    } finally {
      setGuardando(false)
    }
  }

  const disponibles = contactosHospital.filter(c => !linked.has(c.id))

  return (
    <div className="space-y-5">
      {/* Contactos vinculados */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">
            Contactos del proyecto
            {pp.contactos.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">{pp.contactos.length}</span>
            )}
          </h3>
          <button
            onClick={() => setMostrarForm(v => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {mostrarForm ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}
            </svg>
            {mostrarForm ? "Cancelar" : "Nuevo contacto"}
          </button>
        </div>

        {/* Formulario crear contacto */}
        {mostrarForm && (
          <form onSubmit={crearYVincular} className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Crear y vincular contacto</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <input
                  required
                  value={form.nombre}
                  onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Nombre *"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                />
              </div>
              <input
                value={form.cargo}
                onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))}
                placeholder="Cargo"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              />
              <input
                value={form.telefono}
                onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                placeholder="Teléfono"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              />
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="Email"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white sm:col-span-2"
              />
            </div>
            <button
              type="submit"
              disabled={guardando || !form.nombre.trim()}
              className="w-full py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ backgroundColor: TEAL }}
            >
              {guardando ? "Guardando…" : "Crear y vincular"}
            </button>
          </form>
        )}

        {/* Lista vinculados */}
        {pp.contactos.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Sin contactos vinculados. Crea uno nuevo o vincula uno del hospital.</p>
        ) : (
          <div className="space-y-2">
            {pp.contactos.map(({ contacto: c }) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4 bg-gray-50">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 text-sm">{c.nombre}</p>
                    {c.principal && <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-semibold">Principal</span>}
                  </div>
                  {c.cargo && <p className="text-xs text-gray-500 mt-0.5">{c.cargo}</p>}
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    {c.email && <a href={`mailto:${c.email}`} className="hover:text-teal-600 transition-colors">{c.email}</a>}
                    {c.telefono && <a href={`tel:${c.telefono}`} className="hover:text-teal-600 transition-colors">{c.telefono}</a>}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <button
                    onClick={() => setPrincipal(c.id, !c.principal)}
                    title={c.principal ? "Quitar principal" : "Marcar como principal"}
                    className={`p-1.5 rounded-lg transition-colors ${c.principal ? "text-amber-400 hover:text-amber-600" : "text-gray-200 hover:text-amber-400"}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={c.principal ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => desvincular(c.id)}
                    title="Desvincular"
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contactos del hospital disponibles para vincular */}
      {disponibles.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Otros contactos del hospital
            <span className="ml-1.5 text-gray-400 font-normal">— vincular directamente</span>
          </h4>
          <div className="space-y-2">
            {disponibles.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-xl border border-gray-100 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">{c.nombre}</p>
                  {c.cargo && <p className="text-xs text-gray-400">{c.cargo}</p>}
                </div>
                <button
                  onClick={() => vincular(c)}
                  disabled={guardando}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: TEAL }}
                >
                  Vincular
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

