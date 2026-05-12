"use client"

import { useEffect, useState } from "react"
import { TEAL } from "@/lib/brand"

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Administrador", VENTAS: "Ventas", PROYECTOS: "Proyectos", TECNICO: "Técnico",
}

interface Toast { msg: string; tipo: "ok" | "error" }
interface PerfilData { id: string; nombre: string; email: string; rol: string; creadoEn: string }

export default function PerfilPage() {
  const [perfil, setPerfil] = useState<PerfilData | null>(null)
  const [nombre, setNombre] = useState("")
  const [pwActual, setPwActual] = useState("")
  const [pwNueva, setPwNueva] = useState("")
  const [pwConfirm, setPwConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [guardandoNombre, setGuardandoNombre] = useState(false)
  const [guardandoPw, setGuardandoPw] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    fetch("/api/perfil")
      .then(r => r.json())
      .then((d: PerfilData) => {
        setPerfil(d)
        setNombre(d.nombre ?? "")
      })
      .catch(() => {})
  }, [])

  function mostrarToast(msg: string, tipo: "ok" | "error") {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  async function guardarNombre(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setGuardandoNombre(true)
    const r = await fetch("/api/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre.trim() }),
    })
    const d = await r.json()
    setGuardandoNombre(false)
    if (r.ok) {
      setPerfil(p => p ? { ...p, nombre: d.nombre } : p)
      mostrarToast("Nombre actualizado correctamente", "ok")
    } else {
      mostrarToast(d.error ?? "Error al guardar", "error")
    }
  }

  async function cambiarPassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwNueva !== pwConfirm) { mostrarToast("Las contraseñas no coinciden", "error"); return }
    if (pwNueva.length < 8) { mostrarToast("La contraseña debe tener al menos 8 caracteres", "error"); return }
    setGuardandoPw(true)
    const r = await fetch("/api/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passwordActual: pwActual, passwordNueva: pwNueva }),
    })
    const d = await r.json()
    setGuardandoPw(false)
    if (r.ok) {
      setPwActual(""); setPwNueva(""); setPwConfirm("")
      mostrarToast("Contraseña actualizada correctamente", "ok")
    } else {
      mostrarToast(d.error ?? "Error al cambiar contraseña", "error")
    }
  }

  const inicial = (perfil?.nombre ?? "U").charAt(0).toUpperCase()
  const creadoLabel = perfil?.creadoEn
    ? new Date(perfil.creadoEn).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })
    : "—"

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
            toast.tipo === "ok" ? "bg-emerald-500" : "bg-red-500"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestiona tu información personal y contraseña</p>
      </div>

      {/* Tarjeta info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center gap-5">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0"
          style={{ backgroundColor: TEAL }}
        >
          {inicial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-semibold text-gray-900 truncate">{perfil?.nombre ?? "—"}</p>
          <p className="text-sm text-gray-500 truncate">{perfil?.email ?? "—"}</p>
          <span
            className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full text-white"
            style={{ backgroundColor: TEAL }}
          >
            {ROL_LABEL[perfil?.rol ?? ""] ?? perfil?.rol ?? "—"}
          </span>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Miembro desde</p>
          <p className="text-sm text-gray-600 mt-0.5">{creadoLabel}</p>
        </div>
      </div>

      {/* Formulario nombre */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Nombre de usuario</h2>
        <form onSubmit={guardarNombre} className="flex gap-3">
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Tu nombre"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
          />
          <button
            type="submit"
            disabled={guardandoNombre || !nombre.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: TEAL }}
          >
            {guardandoNombre ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </div>

      {/* Formulario contraseña */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">Cambiar contraseña</h2>
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {showPw ? "Ocultar campos" : "Mostrar campos"}
          </button>
        </div>
        {showPw && (
          <form onSubmit={cambiarPassword} className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Contraseña actual</label>
              <input
                type="password"
                value={pwActual}
                onChange={e => setPwActual(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={pwNueva}
                onChange={e => setPwNueva(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={pwConfirm}
                onChange={e => setPwConfirm(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                required
              />
            </div>
            <button
              type="submit"
              disabled={guardandoPw}
              className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: TEAL }}
            >
              {guardandoPw ? "Cambiando..." : "Cambiar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
