"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { TEAL } from "@/lib/brand"
import { comprimirImagen } from "@/lib/img-compress"

interface Comentario {
  id: string
  autorId: string
  autorNombre: string
  contenido: string
  fotos?: string[]
  creadoEn: string
}

interface Props {
  endpoint: string
  usuarioId: string
  esAdmin: boolean
}

function avColor(s: string) {
  const cs = ["#0d9488","#0891b2","#7c3aed","#db2777","#ea580c","#65a30d","#2563eb"]
  let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h)
  return cs[Math.abs(h) % cs.length]
}

function fechaRel(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (d < 1) return "Ahora mismo"
  if (d < 60) return `Hace ${d} min`
  const h = Math.floor(d / 60)
  if (h < 24) return `Hace ${h}h`
  const days = Math.floor(h / 24)
  if (days === 1) return "Ayer"
  if (days < 7) return `Hace ${days} días`
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" })
}

export function ComentariosPanel({ endpoint, usuarioId, esAdmin }: Props) {
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [cargando, setCargando] = useState(true)
  const [texto, setTexto] = useState("")
  const [fotos, setFotos] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const listaRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    const r = await fetch(endpoint)
    if (r.ok) { const d = await r.json(); setComentarios(Array.isArray(d) ? d : []) }
    setCargando(false)
  }, [endpoint])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    if (listaRef.current) listaRef.current.scrollTop = listaRef.current.scrollHeight
  }, [comentarios])

  async function handleFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    const max = 2 - fotos.length
    const toProcess = Array.from(files).slice(0, max)
    for (const file of toProcess) {
      try {
        const compressed = await comprimirImagen(file, 800, 0.7)
        setFotos(prev => prev.length < 2 ? [...prev, compressed] : prev)
      } catch { /* ignore invalid files */ }
    }
    if (fileRef.current) fileRef.current.value = ""
  }

  async function enviar() {
    const t = texto.trim()
    if ((!t && fotos.length === 0) || enviando) return
    setEnviando(true)
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido: t || "(foto)", fotos }),
    })
    if (r.ok) { setTexto(""); setFotos([]); await cargar() }
    setEnviando(false)
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este comentario?")) return
    await fetch(`${endpoint}/${id}`, { method: "DELETE" })
    setComentarios(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Comentarios</span>
        {comentarios.length > 0 && <span className="text-xs text-gray-400">({comentarios.length})</span>}
      </div>

      <div ref={listaRef} className="divide-y divide-gray-50 dark:divide-gray-800 max-h-80 overflow-y-auto">
        {cargando ? (
          <div className="py-6 text-center text-xs text-gray-400">Cargando…</div>
        ) : comentarios.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">Sin comentarios. Sé el primero.</div>
        ) : (
          comentarios.map(c => {
            const cFotos = Array.isArray(c.fotos) ? c.fotos : []
            return (
              <div key={c.id} className="flex gap-3 px-4 py-3 group">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 mt-0.5"
                  style={{ backgroundColor: avColor(c.autorNombre) }}>
                  {c.autorNombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{c.autorNombre}</span>
                    <span className="text-[10px] text-gray-400">{fechaRel(c.creadoEn)}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed break-words">{c.contenido !== "(foto)" ? c.contenido : ""}</p>
                  {cFotos.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {cFotos.map((src, i) => (
                        <button key={i} onClick={() => setLightbox(src)} className="cursor-pointer">
                          <img src={src} alt={`Foto ${i + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700 hover:opacity-80 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {(esAdmin || c.autorId === usuarioId) && (
                  <button onClick={() => eliminar(c.id)}
                    className="text-gray-200 hover:text-red-400 transition-colors shrink-0 self-start mt-0.5 opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Eliminar">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                    </svg>
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3">
        {/* Preview fotos adjuntas */}
        {fotos.length > 0 && (
          <div className="flex gap-2 mb-2">
            {fotos.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt={`Adjunto ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                <button onClick={() => setFotos(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold hover:bg-red-600 cursor-pointer shadow-sm">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar() } }}
            placeholder="Comentario… (Enter para enviar)"
            rows={1}
            className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent resize-none min-h-[38px] max-h-24"
            style={{ lineHeight: "1.45" }}
          />
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFotos} />
          <button onClick={() => fileRef.current?.click()} disabled={fotos.length >= 2}
            className="px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 shrink-0 min-h-[38px] cursor-pointer"
            title={fotos.length >= 2 ? "Máximo 2 fotos" : "Adjuntar foto"}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          <button onClick={enviar} disabled={(!texto.trim() && fotos.length === 0) || enviando}
            className="px-3 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0 min-h-[38px] cursor-pointer"
            style={{ backgroundColor: TEAL }}>
            {enviando ? "…" : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Foto ampliada" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl" />
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
