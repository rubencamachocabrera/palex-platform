"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"

interface ShareData {
  nombre: string
  hospital: string
  ciudad: string
  mapaHtml: string
}

export default function ShareMapaPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<ShareData | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [iframeHeight, setIframeHeight] = useState(600)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then(r => r.ok ? r.json() : r.json().then((d: { error: string }) => { throw new Error(d.error) }))
      .then(setData)
      .catch(e => setError(e.message ?? "Enlace no válido"))
      .finally(() => setLoading(false))
  }, [token])

  function handleLoad(e: React.SyntheticEvent<HTMLIFrameElement>) {
    try {
      const doc = e.currentTarget.contentDocument
      if (doc) {
        const h = doc.documentElement.scrollHeight || doc.body?.scrollHeight || 600
        setIframeHeight(Math.max(400, Math.min(h + 32, 10000)))
      }
    } catch { setIframeHeight(3000) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-500 rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3 p-6">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <p className="text-gray-700 font-semibold">Enlace no disponible</p>
      <p className="text-sm text-gray-400 text-center max-w-xs">{error}</p>
    </div>
  )

  if (!data) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra superior mínima */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{data.nombre}</p>
          <p className="text-xs text-gray-400 truncate">{data.hospital} · {data.ciudad}</p>
        </div>
        <span className="text-xs bg-teal-50 text-teal-600 border border-teal-200 font-semibold px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">
          InLab · Palex Medical
        </span>
      </div>

      {/* Mapa */}
      <iframe
        ref={iframeRef}
        srcDoc={data.mapaHtml}
        sandbox="allow-scripts"
        onLoad={handleLoad}
        className="w-full border-0 block"
        style={{ height: iframeHeight }}
        title={data.nombre}
      />
    </div>
  )
}
