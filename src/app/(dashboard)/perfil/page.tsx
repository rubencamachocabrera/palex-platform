"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"

const TEAL = "#00A99D"

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Administrador", VENTAS: "Ventas", PROYECTOS: "Proyectos",
}

interface Toast { msg: string; tipo: "ok" | "error" }

export default function PerfilPage() {
  const { data: session, update } = useSession()
  const rol = (session?.user as { role?: string })?.role ?? ""
  const inicial = (session?.user?.name ?? "U").charAt(0).toUpperCase()

  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [creadoEn, setCreadoEn] = useState("")

  const [pwActual, setPwActual] = useState("")
  const [pwNueva, setPwNueva] = useState("")
  const [pwConfirm, setPwConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)

  const [guardandoNombre, setGuardandoNombre] = useState(false)
  const [guardandoPw, setGuardandoPw] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    fetch("/api/perfil").then(r => r.json()).then(d => {
      setNombre(d.nombre ?? "")
      setEmail(d.email ?? "")
      setCreadoEn(d.creadoEn ?? "")
    })
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
      body: JSON.stringify({ nombre }),
    })
    const data = await r.json()
    setGuardandoNombre(false)
    if (!r.ok) { mostrarToast(data.error ?? "Error al guardar", "error"); return }
    mostrarToast("Nombre actualizado correctamente", "ok")
    await update({ name: data.nombre })
  }

  async function guardarPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!pwActual || !pwNueva) return
    if (pwNueva !== pwConfirm) { mostrarToast("Las contraseñas no coinciden", "error"); return }
    if (pwNueva.length < 8) { mostrarToast("La contraseña debe tener al menos 8 caracteres", "error"); return }
    setGuardandoPw(true)
    const r = await fetch("/api/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passwordActual: pwActual, passwordNueva: pwNueva }),
    })
    const data = await r.json()
    setGuardandoPw(false)
    if (!r.ok) { mostrarToast(data.error ?? "Error", "error"); return }
    mostrarToast("Contraseña actualizada correctamente", "ok")
    setPwActual(""); setPwNueva(""); setPwConfirm("")
  }

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white transition"
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5"

  return (
    <div className="max-w-2xl">

      {/* Cabecera */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gestiona tu información personal y contraseña</p>
      </div>

      {/* Card de identidad */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shrink-0"
            style={{ backgroundColor: TEAL }}
          >
            {inicial}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{nombre || session?.user?.name}</p>
            <p className="text-sm text-gray-400">{email}</p>
            <span
              className="inline-block mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: TEAL }}
            >
              {ROL_LABEL[rol] ?? rol}
            </span>
          </div>
        </div>
        {creadoEn && (
          <p className="text-xs text-gray-300 mt-5 pt-4 border-t border-gray-50">
            Cuenta creada el {new Date(creadoEn).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </div>

      {/* Editar nombre */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-bold text-gray-800 mb-5">Información personal</h2>
        <form onSubmit={guardarNombre} className="space-y-4">
          <div>
            <label className={labelClass}>Nombre completo</label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Tu nombre"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              value={email}
              disabled
              className={inputClass + " opacity-50 cursor-not-allowed"}
            />
            <p className="text-xs text-gray-400 mt-1">El email no se puede cambiar desde aquí.</p>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={guardandoNombre}
              className="text-sm font-semibold text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition disabled:opacity-50"
              style={{ backgroundColor: TEAL }}
            >
              {guardandoNombre ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-800 mb-5">Cambiar contraseña</h2>
        <form onSubmit={guardarPassword} className="space-y-4">
          <div>
            <label className={labelClass}>Contraseña actual</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={pwActual}
                onChange={e => setPwActual(e.target.value)}
                placeholder="••••••••"
                className={inputClass + " pr-11"}
              />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                {showPw ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nueva contraseña</label>
              <input type="password" value={pwNueva} onChange={e => setPwNueva(e.target.value)}
                placeholder="Min. 8 caracteres" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Confirmar nueva</label>
              <input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)}
                placeholder="Repite la contraseña" className={inputClass} />
            </div>
          </div>
          {pwNueva && pwConfirm && pwNueva !== pwConfirm && (
            <p className="text-xs text-red-500">Las contraseñas no coinciden</p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={guardandoPw || !pwActual || !pwNueva || pwNueva !== pwConfirm}
              className="text-sm font-semibold text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition disabled:opacity-50"
              style={{ backgroundColor: TEAL }}
            >
              {guardandoPw ? "Cambiando…" : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-medium text-white transition-all ${toast.tipo === "ok" ? "bg-green-500" : "bg-red-500"}`}>
          <span>{toast.tipo === "ok" ? "✓" : "✕"}</span>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
