"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { TEAL, ORANGE } from "@/lib/brand"
import QRCode from "qrcode"

type EstadoModulo = "PENDIENTE" | "EN_INSTALACION" | "INSTALADO" | "FORMACION" | "VALIDADO"

const ESTADO_MODULO_LABEL: Record<EstadoModulo, string> = {
  PENDIENTE: "Pendiente",
  EN_INSTALACION: "En instalación",
  INSTALADO: "Instalado",
  FORMACION: "Formación",
  VALIDADO: "Validado",
}
const ESTADO_MODULO_COLOR: Record<EstadoModulo, string> = {
  PENDIENTE: "bg-gray-100 text-gray-500",
  EN_INSTALACION: "bg-blue-50 text-blue-600",
  INSTALADO: "bg-teal-50 text-teal-600",
  FORMACION: "bg-amber-50 text-amber-600",
  VALIDADO: "bg-emerald-50 text-emerald-600",
}

interface ModuloInlab { id: string; nombre: string; activo: boolean }
interface ProyectoModulo { modulo: ModuloInlab; estado: EstadoModulo }
interface Hospital { id: string; nombre: string; ciudad: string; provincia: string | null }
interface Proyecto {
  id: string
  nombre: string
  hospital: Hospital
  fechaInicio: string
  fechaFin: string | null
  refConcurso: string | null
  mapaHtml: string | null
  mapaToken: string | null
  modulos: ProyectoModulo[]
  creadoEn: string
  actualizadoEn: string
}

// ─── Helpers ──────────────────────────────────────────────

function fmtFecha(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
}

function toDateInput(iso: string | null) {
  if (!iso) return ""
  return new Date(iso).toISOString().split("T")[0]
}

// ─── Iconos ───────────────────────────────────────────────

function IconArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  )
}
function IconEdit() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}
function IconSave() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
    </svg>
  )
}
function IconUpload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  )
}
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}
function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}
function IconExpand() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
    </svg>
  )
}
function IconPDF() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  )
}

// ─── Página ───────────────────────────────────────────────

type Tab = "info" | "modulos" | "mapa"

export default function ProyectoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [todosModulos, setTodosModulos] = useState<ModuloInlab[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("info")
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [subiendoMapa, setSubiendoMapa] = useState(false)
  const [iframeHeight, setIframeHeight] = useState(600)
  const [linkCompartir, setLinkCompartir] = useState("")
  const [generandoLink, setGenerandoLink] = useState(false)
  const [shareModal, setShareModal] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [toast, setToast] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Form de edición
  const [form, setForm] = useState({
    nombre: "",
    hospitalId: "",
    fechaInicio: "",
    fechaFin: "",
    refConcurso: "",
    moduloIds: [] as string[],
  })

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }

  const cargar = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/proyectos/${id}`).then(r => r.ok ? r.json() : null),
      fetch("/api/modulos-inlab").then(r => r.ok ? r.json() : []),
    ]).then(([p, m]) => {
      if (p) {
        setProyecto(p)
        if (p.mapaToken) {
          setLinkCompartir(`${window.location.origin}/share/${p.mapaToken}`)
        }
        setForm({
          nombre: p.nombre,
          hospitalId: p.hospital.id,
          fechaInicio: toDateInput(p.fechaInicio),
          fechaFin: toDateInput(p.fechaFin),
          refConcurso: p.refConcurso ?? "",
          moduloIds: p.modulos.map((pm: ProyectoModulo) => pm.modulo.id),
        })
      }
      if (Array.isArray(m)) setTodosModulos(m)
    }).finally(() => setLoading(false))
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    if (!linkCompartir) { setQrDataUrl(null); return }
    QRCode.toDataURL(linkCompartir, { width: 220, margin: 2 })
      .then(url => setQrDataUrl(url))
      .catch(() => setQrDataUrl(null))
  }, [linkCompartir])

  function toggleModulo(mid: string) {
    setForm(f => ({
      ...f,
      moduloIds: f.moduloIds.includes(mid)
        ? f.moduloIds.filter(x => x !== mid)
        : [...f.moduloIds, mid],
    }))
  }

  async function guardar() {
    setGuardando(true)
    const r = await fetch(`/api/proyectos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setGuardando(false)
    if (r.ok) {
      const updated = await r.json()
      setProyecto(updated)
      setEditando(false)
      showToast("Proyecto guardado")
    } else {
      showToast("Error al guardar")
    }
  }

  async function subirMapa(file: File) {
    setSubiendoMapa(true)
    const fd = new FormData()
    fd.append("mapa", file)
    const r = await fetch(`/api/proyectos/${id}/mapa`, { method: "POST", body: fd })
    setSubiendoMapa(false)
    if (r.ok) {
      setIframeHeight(600)
      cargar()
      showToast("Mapa importado correctamente")
    } else {
      const d = await r.json()
      showToast(d.error ?? "Error al subir el mapa")
    }
  }

  function handleIframeLoad(e: React.SyntheticEvent<HTMLIFrameElement>) {
    try {
      const doc = e.currentTarget.contentDocument
      if (doc) {
        const h = doc.documentElement.scrollHeight || doc.body?.scrollHeight || 600
        setIframeHeight(Math.max(400, Math.min(h + 32, 10000)))
      }
    } catch {
      setIframeHeight(3000)
    }
  }

  async function actualizarEstadoModulo(moduloId: string, estado: EstadoModulo) {
    await fetch(`/api/proyectos/${id}/modulos/${moduloId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    })
    setProyecto(prev => prev ? {
      ...prev,
      modulos: prev.modulos.map(pm =>
        pm.modulo.id === moduloId ? { ...pm, estado } : pm
      ),
    } : prev)
  }

  async function compartirMapa() {
    setGenerandoLink(true)
    const r = await fetch(`/api/proyectos/${id}/mapa/compartir`, { method: "POST" })
    setGenerandoLink(false)
    if (r.ok) {
      const d = await r.json()
      setLinkCompartir(d.url)
      setShareModal(true)
    } else {
      showToast("Error al generar el enlace")
    }
  }

  async function revocarCompartir() {
    await fetch(`/api/proyectos/${id}/mapa/compartir`, { method: "DELETE" })
    setLinkCompartir("")
    setProyecto(prev => prev ? { ...prev, mapaToken: null } : prev)
    showToast("Enlace revocado")
  }

  function abrirEnPestana() {
    if (!proyecto?.mapaHtml) return
    const blob = new Blob([proyecto.mapaHtml], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank")
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  async function eliminarMapa() {
    if (!confirm("¿Eliminar el mapa interactivo de este proyecto?")) return
    await fetch(`/api/proyectos/${id}/mapa`, { method: "DELETE" })
    cargar()
    showToast("Mapa eliminado")
  }

  function exportarPDF() {
    if (!proyecto?.mapaHtml) return
    const fechaHoy = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
    const mapaJson = JSON.stringify(proyecto.mapaHtml).replace(/<\/script/gi, "<\\/script")
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${proyecto.nombre} — Palex InLab</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff}
header{background:#00A99D;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 28px;height:64px;flex-shrink:0}
.logo-area{display:flex;align-items:center;gap:14px}
.logo-text{font-size:22px;font-weight:800;letter-spacing:-0.5px}
.badge-inlab{background:#F7941D;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;letter-spacing:0.6px;text-transform:uppercase}
.header-right{text-align:right}
.header-right h1{font-size:15px;font-weight:700;max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.header-right p{font-size:12px;opacity:.75;margin-top:2px}
.infostrip{display:flex;gap:28px;padding:9px 28px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;flex-wrap:wrap;align-items:center}
.infostrip strong{color:#1e293b}
.infostrip .spacer{flex:1}
.map-wrap{width:100%}
.map-wrap iframe{width:100%;border:none;display:block;height:calc(100vh - 108px)}
.footer-print{display:none;text-align:center;font-size:11px;color:#94a3b8;padding:10px 0;border-top:1px solid #f1f5f9}
.actions{position:fixed;bottom:20px;right:20px;display:flex;gap:10px;z-index:9999}
.btn-close{background:#fff;color:#64748b;border:1px solid #e2e8f0;padding:10px 20px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.08)}
.btn-close:hover{background:#f8fafc}
.btn-print{background:#00A99D;color:#fff;border:none;padding:10px 20px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(0,169,157,.35);display:flex;align-items:center;gap:8px}
.btn-print:hover{opacity:.9}
@media print{
  .actions{display:none!important}
  .footer-print{display:block}
  @page{size:A3 landscape;margin:0}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .map-wrap iframe{height:calc(100vh - 128px)!important}
}
</style>
</head>
<body>
<header>
  <div class="logo-area">
    <span class="logo-text">PALEX</span>
    <span class="badge-inlab">InLab</span>
  </div>
  <div class="header-right">
    <h1>${proyecto.nombre}</h1>
    <p>${proyecto.hospital.nombre}&nbsp;&middot;&nbsp;${proyecto.hospital.ciudad}</p>
  </div>
</header>
<div class="infostrip">
  <span>Ref: <strong>${proyecto.refConcurso || "—"}</strong></span>
  <span>Inicio: <strong>${fmtFecha(proyecto.fechaInicio)}</strong></span>
  <span>Fin: <strong>${fmtFecha(proyecto.fechaFin)}</strong></span>
  <span>Módulos: <strong>${proyecto.modulos.length}</strong></span>
  <span class="spacer"></span>
  <span>Generado: <strong>${fechaHoy}</strong></span>
</div>
<div class="map-wrap">
  <iframe id="mapa" title="Mapa interactivo"></iframe>
</div>
<div class="footer-print">Palex Medical &nbsp;&middot;&nbsp; Documento confidencial &nbsp;&middot;&nbsp; ${fechaHoy}</div>
<div class="actions">
  <button class="btn-close" onclick="window.close()">Cerrar</button>
  <button class="btn-print" onclick="window.print()">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    Imprimir / Guardar PDF
  </button>
</div>
<script>
(function(){var m=${mapaJson};document.getElementById('mapa').srcdoc=m})();
</script>
</body>
</html>`
    const win = window.open("", "_blank", "width=1400,height=900,resizable=yes")
    if (!win) { showToast("Activa ventanas emergentes para exportar PDF"); return }
    win.document.write(html)
    win.document.close()
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-1/3" />
        <div className="h-8 bg-gray-100 rounded w-1/2 mt-4" />
        <div className="h-40 bg-gray-100 rounded-2xl mt-6" />
      </div>
    )
  }

  if (!proyecto) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-gray-500">Proyecto no encontrado.</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-teal-600 hover:underline">
          ← Volver
        </button>
      </div>
    )
  }

  const modulosSeleccionados = editando
    ? todosModulos.filter(m => form.moduloIds.includes(m.id))
    : proyecto.modulos.map(pm => pm.modulo)

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg transition-all"
          style={{ backgroundColor: TEAL }}
        >
          {toast}
        </div>
      )}

      {/* Share modal */}
      {shareModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={() => setShareModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Compartir mapa del proyecto</h3>
                <p className="text-xs text-gray-400 mt-0.5">El enlace permite ver el mapa sin iniciar sesión</p>
              </div>
              <button onClick={() => setShareModal(false)} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                <IconX />
              </button>
            </div>
            {/* Status pill */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: `${TEAL}18`, color: TEAL }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: TEAL }} />
                Enlace activo
              </span>
            </div>
            {/* URL box */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <span className="text-[11px] text-gray-600 font-mono flex-1 truncate">{linkCompartir}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(linkCompartir); showToast("Copiado al portapapeles") }}
                className="shrink-0 px-2.5 py-1 text-xs font-semibold rounded-lg text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: TEAL }}
              >
                Copiar
              </button>
            </div>
            {/* QR */}
            {qrDataUrl ? (
              <div className="flex flex-col items-center gap-2 py-1">
                <div className="p-2 border border-gray-100 rounded-2xl bg-white shadow-sm">
                  <img src={qrDataUrl} alt="QR mapa proyecto" className="w-44 h-44" />
                </div>
                <a href={qrDataUrl} download="qr-mapa-proyecto.png"
                  className="text-xs text-gray-400 hover:underline transition-colors" style={{ color: TEAL }}>
                  Descargar código QR
                </a>
              </div>
            ) : (
              <div className="flex items-center justify-center h-20 text-xs text-gray-300">Generando QR…</div>
            )}
            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <a
                href={linkCompartir}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-3 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-center transition-colors"
              >
                Abrir enlace
              </a>
              <button
                onClick={async () => { await revocarCompartir(); setShareModal(false) }}
                className="flex-1 px-3 py-2 text-sm font-medium rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
              >
                Revocar acceso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.push("/proyectos")}
          className="mt-0.5 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
        >
          <IconArrowLeft />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 mb-1">{proyecto.hospital.nombre} · {proyecto.hospital.ciudad}</p>
          {editando ? (
            <input
              className="w-full text-xl font-bold text-gray-900 border-b-2 focus:outline-none pb-1"
              style={{ borderColor: TEAL }}
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            />
          ) : (
            <h1 className="text-xl font-bold text-gray-900 truncate">{proyecto.nombre}</h1>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {editando ? (
            <>
              <button
                onClick={() => { setEditando(false); cargar() }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-1.5"
              >
                <IconX /> Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="px-3 py-1.5 text-sm font-medium text-white rounded-xl disabled:opacity-50 flex items-center gap-1.5 transition-opacity hover:opacity-90"
                style={{ backgroundColor: TEAL }}
              >
                <IconSave /> {guardando ? "Guardando..." : "Guardar"}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditando(true)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 border border-gray-200 transition-colors flex items-center gap-1.5"
            >
              <IconEdit /> Editar
            </button>
          )}
        </div>
      </div>

      {/* Tabs — scrollable en móvil */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit min-w-max">
          {([["info", "Información"], ["modulos", "Módulos INLAB"], ["mapa", "Mapa del proyecto"]] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap"
              style={tab === t ? { backgroundColor: "white", color: TEAL, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" } : { color: "#6b7280" }}
            >
              {label}
              {t === "mapa" && proyecto.mapaHtml && (
                <span className="ml-1.5 w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: ORANGE }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Tab: Información ─── */}
      {tab === "info" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1">Fecha de inicio</p>
              {editando ? (
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ ["--tw-ring-color" as string]: TEAL }}
                  value={form.fechaInicio}
                  onChange={e => setForm(f => ({ ...f, fechaInicio: e.target.value }))}
                />
              ) : (
                <p className="text-sm text-gray-900 font-medium">{fmtFecha(proyecto.fechaInicio)}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1">Fecha de fin</p>
              {editando ? (
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ ["--tw-ring-color" as string]: TEAL }}
                  value={form.fechaFin}
                  onChange={e => setForm(f => ({ ...f, fechaFin: e.target.value }))}
                />
              ) : (
                <p className="text-sm text-gray-900 font-medium">{fmtFecha(proyecto.fechaFin)}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-gray-400 mb-1">Referencia del concurso</p>
              {editando ? (
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ ["--tw-ring-color" as string]: TEAL }}
                  value={form.refConcurso}
                  onChange={e => setForm(f => ({ ...f, refConcurso: e.target.value }))}
                  placeholder="Ej: EXP-2024-MAD-0123"
                />
              ) : (
                <p className="text-sm text-gray-900">{proyecto.refConcurso || "—"}</p>
              )}
            </div>
          </div>
          <div className="pt-4 border-t border-gray-50">
            <p className="text-[11px] text-gray-300">
              Creado {fmtFecha(proyecto.creadoEn)} · Actualizado {fmtFecha(proyecto.actualizadoEn)}
            </p>
          </div>
        </div>
      )}

      {/* ─── Tab: Módulos ─── */}
      {tab === "modulos" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Módulos INLAB</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {(editando ? form.moduloIds.length : proyecto.modulos.length)} módulo{(editando ? form.moduloIds.length : proyecto.modulos.length) !== 1 ? "s" : ""} incluido{(editando ? form.moduloIds.length : proyecto.modulos.length) !== 1 ? "s" : ""}
              </p>
            </div>
            {!editando && (
              <button
                onClick={() => setEditando(true)}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <IconEdit /> Editar
              </button>
            )}
          </div>

          {editando ? (
            <div className="space-y-2.5">
              {todosModulos.map(m => (
                <label key={m.id} className="flex items-center gap-3 cursor-pointer group p-2 rounded-xl hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    className="rounded w-4 h-4 cursor-pointer"
                    style={{ accentColor: TEAL }}
                    checked={form.moduloIds.includes(m.id)}
                    onChange={() => toggleModulo(m.id)}
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{m.nombre}</span>
                </label>
              ))}
            </div>
          ) : proyecto.modulos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No hay módulos asignados.{" "}
              <button onClick={() => setEditando(true)} className="underline" style={{ color: TEAL }}>
                Añadir módulos
              </button>
            </p>
          ) : (
            <div className="space-y-2">
              {proyecto.modulos.map(pm => (
                <div
                  key={pm.modulo.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl border border-gray-100 min-h-[52px]"
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: TEAL }} />
                  <span className="text-sm text-gray-800 flex-1 min-w-0">{pm.modulo.nombre}</span>
                  <select
                    value={pm.estado}
                    onChange={e => actualizarEstadoModulo(pm.modulo.id, e.target.value as EstadoModulo)}
                    className={`text-xs font-semibold px-2.5 py-2.5 rounded-lg border-0 cursor-pointer focus:outline-none focus:ring-2 shrink-0 min-h-[44px] min-w-[130px] ${ESTADO_MODULO_COLOR[pm.estado]}`}
                    style={{ ["--tw-ring-color" as string]: TEAL }}
                  >
                    {(Object.keys(ESTADO_MODULO_LABEL) as EstadoModulo[]).map(e => (
                      <option key={e} value={e}>{ESTADO_MODULO_LABEL[e]}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Mapa ─── */}
      {tab === "mapa" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">Mapa interactivo del proyecto</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {proyecto.mapaHtml ? "Mapa HTML cargado" : "Sin mapa — importa un fichero HTML"}
              </p>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              {proyecto.mapaHtml && (
                <>
                  <button
                    onClick={() => {
                      const blob = new Blob([proyecto.mapaHtml!], { type: "text/html;charset=utf-8" })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      a.download = `${proyecto.nombre.replace(/\s+/g, "_")}_mapa.html`
                      a.click()
                      setTimeout(() => URL.revokeObjectURL(url), 5000)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    title="Descargar fichero HTML para compartir por WhatsApp / email"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Descargar
                  </button>
                  <button
                    onClick={exportarPDF}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    title="Exportar mapa como PDF con cabecera Palex"
                  >
                    <IconPDF />
                    PDF
                  </button>
                  <button
                    onClick={abrirEnPestana}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    title="Abrir en pestaña nueva (imprimir)"
                  >
                    <IconExpand />
                  </button>
                  <button
                    onClick={eliminarMapa}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    title="Eliminar mapa"
                  >
                    <IconTrash />
                  </button>
                </>
              )}
              {proyecto.mapaHtml && (
                <button
                  onClick={linkCompartir ? () => setShareModal(true) : compartirMapa}
                  disabled={generandoLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border transition-colors disabled:opacity-50"
                  style={linkCompartir
                    ? { backgroundColor: `${TEAL}15`, borderColor: `${TEAL}40`, color: TEAL }
                    : { backgroundColor: "white", borderColor: "#e5e7eb", color: "#4b5563" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                  {generandoLink ? "..." : linkCompartir ? "Enlace activo" : "Compartir"}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".html,.htm"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) subirMapa(f); e.target.value = "" }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={subiendoMapa}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white rounded-xl disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ backgroundColor: TEAL }}
              >
                <IconUpload />
                {subiendoMapa ? "Subiendo..." : proyecto.mapaHtml ? "Actualizar mapa" : "Importar mapa"}
              </button>
            </div>
          </div>


          {/* Visor — auto-height al cargar el documento */}
          {proyecto.mapaHtml ? (
            <iframe
              ref={iframeRef}
              srcDoc={proyecto.mapaHtml}
              sandbox="allow-scripts allow-same-origin"
              onLoad={handleIframeLoad}
              className="w-full border-0"
              style={{ height: iframeHeight }}
              title="Mapa interactivo del proyecto"
            />
          ) : (
            <div
              className="flex flex-col items-center justify-center py-20 gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: "#e6f7f6", color: TEAL }}
              >
                <IconUpload />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Importar mapa HTML</p>
                <p className="text-xs text-gray-400 mt-1">Haz clic o arrastra aquí el fichero .html generado</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
