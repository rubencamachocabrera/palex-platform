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
      <div className="text-4xl text-gray-300">⚠</div>
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
        sandbox="allow-scripts allow-same-origin"
        onLoad={handleLoad}
        className="w-full border-0 block"
        style={{ height: iframeHeight }}
        title={data.nombre}
      />
    </div>
  )
}
