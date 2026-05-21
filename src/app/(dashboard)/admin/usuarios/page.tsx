"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/components/Toast"
import { TEAL, ORANGE } from "@/lib/brand"

const ROLES = ["ADMIN", "VENTAS", "PROYECTOS", "TECNICO"]

const ROL_COLORS: Record<string, string> = {
  ADMIN: "#6366F1",
  VENTAS: "#F7941D",
  PROYECTOS: TEAL,
  TECNICO: "#0EA5E9",
}

interface Zona { id: string; nombre: string }
interface Usuario {
  id: string; nombre: string; email: string
  rol: string; activo: boolean; creadoEn: string
}

export default function UsuariosPage() {
  const { success, error: toastError } = useToast()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [zonas, setZonas] = useState<Zona[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "VENTAS" })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")

  // Modal zonas
  const [zonaModal, setZonaModal] = useState<Usuario | null>(null)
  const [zonasSeleccionadas, setZonasSeleccionadas] = useState<string[]>([])
  const [guardandoZonas, setGuardandoZonas] = useState(false)

  // Modal editar usuario
  const [editModal, setEditModal] = useState<Usuario | null>(null)
  const [editForm, setEditForm] = useState({ nombre: "", email: "" })
  const [guardandoEdit, setGuardandoEdit] = useState(false)

  async function cargar() {
    const [u, z] = await Promise.all([
      fetch("/api/usuarios").then(r => r.json()),
      fetch("/api/zonas").then(r => r.json()),
    ])
    setUsuarios(u)
    setZonas(z)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  async function crearUsuario(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError("")
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Error al crear usuario")
      setGuardando(false)
      return
    }
    setForm({ nombre: "", email: "", password: "", rol: "VENTAS" })
    setMostrarForm(false)
    success("Usuario creado correctamente")
    await cargar()
    setGuardando(false)
  }

  async function toggleActivo(id: string, activo: boolean) {
    const r = await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !activo }),
    })
    if (!r.ok) { toastError("Error al cambiar el estado del usuario"); return }
    await cargar()
  }

  async function cambiarRol(id: string, rol: string) {
    await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rol }),
    })
    success("Rol actualizado")
    await cargar()
  }

  function abrirEdit(u: Usuario) {
    setEditModal(u)
    setEditForm({ nombre: u.nombre, email: u.email })
  }

  async function guardarEdit() {
    if (!editModal) return
    setGuardandoEdit(true)
    const r = await fetch(`/api/usuarios/${editModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editForm.nombre.trim(), email: editForm.email.trim() }),
    })
    setGuardandoEdit(false)
    if (r.ok) {
      setEditModal(null)
      success("Usuario actualizado")
      await cargar()
    } else {
      const d = await r.json()
      toastError(d.error ?? "Error al guardar")
    }
  }

  async function eliminarUsuario(u: Usuario) {
    if (!confirm(`¿Eliminar a ${u.nombre}? Esta acción no se puede deshacer.`)) return
    const r = await fetch(`/api/usuarios/${u.id}`, { method: "DELETE" })
    if (r.ok) {
      success("Usuario eliminado")
      await cargar()
    } else {
      const d = await r.json()
      toastError(d.error ?? "Error al eliminar")
    }
  }

  async function abrirZonas(u: Usuario) {
    setZonaModal(u)
    const res = await fetch(`/api/usuarios/${u.id}`)
    const data = await res.json()
    setZonasSeleccionadas(Array.isArray(data.zonas) ? data.zonas : [])
  }

  async function guardarZonas() {
    if (!zonaModal) return
    setGuardandoZonas(true)
    await fetch(`/api/usuarios/${zonaModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zonas: zonasSeleccionadas }),
    })
    setGuardandoZonas(false)
    setZonaModal(null)
    success("Zonas asignadas correctamente")
    await cargar()
  }

  function toggleZona(zonaId: string) {
    setZonasSeleccionadas(prev =>
      prev.includes(zonaId) ? prev.filter(z => z !== zonaId) : [...prev, zonaId]
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Usuarios</h1>
          <p className="text-sm text-gray-400 mt-0.5">{usuarios.length} usuarios registrados</p>
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: ORANGE }}
        >
          {mostrarForm ? "Cancelar" : "+ Nuevo usuario"}
        </button>
      </div>

      {/* Formulario nuevo usuario */}
      {mostrarForm && (
        <form
          onSubmit={crearUsuario}
          className="bg-white rounded-xl border border-gray-200 p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
            <input
              required
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none"
              placeholder="Nombre completo"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none"
              placeholder="usuario@palex.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Contrasena inicial</label>
            <input
              required
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none"
              placeholder="Minimo 8 caracteres"
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Rol</label>
            <select
              value={form.rol}
              onChange={e => setForm({ ...form, rol: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none bg-white"
            >
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          {error && <p className="sm:col-span-2 text-sm text-red-500">{error}</p>}
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={guardando}
              className="px-6 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
              style={{ backgroundColor: ORANGE }}
            >
              {guardando ? "Creando..." : "Crear usuario"}
            </button>
          </div>
        </form>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 p-6">Cargando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {["Nombre", "Email", "Rol", "Zonas", "Estado", "Acciones"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-800">{u.nombre}</td>
                  <td className="px-5 py-4 text-gray-500 text-xs">{u.email}</td>
                  <td className="px-5 py-4">
                    <select
                      value={u.rol}
                      onChange={e => cambiarRol(u.id, e.target.value)}
                      className="text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer text-white focus:outline-none"
                      style={{ backgroundColor: ROL_COLORS[u.rol] ?? TEAL }}
                    >
                      {ROLES.map(r => <option key={r} className="text-gray-800 bg-white">{r}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => abrirZonas(u)}
                      className="text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-800 transition-colors"
                    >
                      Gestionar zonas
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.activo ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleActivo(u.id, u.activo)}
                        className={`text-xs font-medium transition-colors ${u.activo ? "text-red-400 hover:text-red-600" : "text-green-500 hover:text-green-700"}`}
                      >
                        {u.activo ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        onClick={() => abrirEdit(u)}
                        className="text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarUsuario(u)}
                        className="text-xs font-medium text-red-300 hover:text-red-600 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal editar usuario */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Editar usuario</h2>
            <p className="text-xs text-gray-400 mb-5">{editModal.email}</p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
                <input
                  value={editForm.nombre}
                  onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEdit}
                disabled={guardandoEdit || !editForm.nombre.trim() || !editForm.email.trim()}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: TEAL }}
              >
                {guardandoEdit ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal zonas */}
      {zonaModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Zonas asignadas</h2>
            <p className="text-xs text-gray-400 mb-5">{zonaModal.nombre}</p>

            {zonas.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No hay zonas creadas. Crea zonas primero.
              </p>
            ) : (
              <div className="space-y-3 mb-6">
                {zonas.map(z => (
                  <label key={z.id} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={zonasSeleccionadas.includes(z.id)}
                      onChange={() => toggleZona(z.id)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: TEAL }}
                    />
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: ORANGE }}
                      >
                        {z.nombre.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{z.nombre}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setZonaModal(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarZonas}
                disabled={guardandoZonas}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: ORANGE }}
              >
                {guardandoZonas ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
