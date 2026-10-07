"use client"

import { useEffect, useState } from "react"
import { crearMatriz, geometria, QR_ACENTO, QR_OJO, QR_TINTA, type QrGeometria } from "./qr"
import s from "./share.module.css"

/** Genera (y cachea por texto) la geometría del QR en el cliente. */
export function useQr(texto: string | null): QrGeometria | null {
  const [res, setRes] = useState<{ texto: string; g: QrGeometria } | null>(null)
  useEffect(() => {
    if (!texto) return
    let vivo = true
    crearMatriz(texto).then(m => { if (vivo) setRes({ texto, g: geometria(m) }) }).catch(() => {})
    return () => { vivo = false }
  }, [texto])
  return texto && res?.texto === texto ? res.g : null
}

/**
 * QR de marca animado: los módulos aparecen desde el centro hacia fuera, los ojos
 * giran a su sitio y la insignia "P" aparece al final. `animar=false` para pantallas
 * donde no aporta (re-render de listas, impresión).
 */
export function QrCodigo({ g, tamano = 220, animar = true, etiqueta }: { g: QrGeometria; tamano?: number | string; animar?: boolean; etiqueta: string }) {
  const m = 2
  const t = g.n + m * 2
  const { x, y, lado } = g.hueco
  const pad = 0.55
  const sz = lado - pad * 2
  const cx = m + x + lado / 2, cy = m + y + lado / 2
  return (
    <svg viewBox={`0 0 ${t} ${t}`} width={tamano} height={tamano} role="img" aria-label={etiqueta} shapeRendering="geometricPrecision" className="block h-auto max-w-full">
      <rect width={t} height={t} rx={1.6} fill="#ffffff" />
      {g.puntos.map(p => (
        <circle key={`${p.x}-${p.y}`} cx={m + p.x + 0.5} cy={m + p.y + 0.5} r={0.44} fill={QR_TINTA}
          className={animar ? s.qrDot : undefined} style={animar ? { animationDelay: `${Math.round(p.dist * 520)}ms` } : undefined} />
      ))}
      {g.ojos.map((o, i) => (
        <g key={i} className={animar ? s.qrEye : undefined} style={animar ? { animationDelay: `${140 + i * 90}ms` } : undefined}>
          <rect x={m + o.x + 0.5} y={m + o.y + 0.5} width={6} height={6} rx={1.9} fill="none" stroke={QR_OJO} strokeWidth={1} />
          <rect x={m + o.x + 2} y={m + o.y + 2} width={3} height={3} rx={0.9} fill={QR_TINTA} />
        </g>
      ))}
      <g className={animar ? s.qrBadge : undefined}>
        <rect x={m + x + pad} y={m + y + pad} width={sz} height={sz} rx={sz * 0.28} fill="#00A99D" />
        <text x={cx - sz * 0.04} y={cy + sz * 0.25} textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight={700} fontSize={sz * 0.72} fill="#ffffff">P</text>
        <circle cx={cx + sz * 0.3} cy={cy - sz * 0.28} r={sz * 0.09} fill={QR_ACENTO} />
      </g>
    </svg>
  )
}
