"use client"

import { BrandLockup } from "@/components/ui/BrandLockup"
import { IconLock } from "@/components/ui/Icons"
import { fmtCompacto, fmtMin, fmtN } from "@/components/inlab/charts"
import type { Kpis } from "@/lib/inlab/analytics"
import { QrCodigo } from "./QrCodigo"
import type { QrGeometria } from "./qr"
import s from "./share.module.css"

export type EstadoTarjeta = "borrador" | "activo" | "caducado" | "revocado"

const ESTADO: Record<EstadoTarjeta, { label: string; cls: string }> = {
  borrador: { label: "Vista previa", cls: "bg-white/10 text-slate-200 ring-white/15" },
  activo: { label: "Enlace activo", cls: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30" },
  caducado: { label: "Caducado", cls: "bg-amber-400/15 text-amber-200 ring-amber-300/30" },
  revocado: { label: "Revocado", cls: "bg-rose-400/15 text-rose-200 ring-rose-300/30" },
}

/**
 * "Tarjeta de informe": lo que verá el cliente, en pequeño. Mini KPIs calculados
 * con las mismas funciones que el dashboard (analytics.kpis) para el periodo y las
 * áreas del enlace, y el QR cuando el enlace existe.
 */
export function TarjetaInforme({ hospital, periodo, alcance, caducidad, kpis, estado, g, url, claveAnimacion }: {
  hospital: string
  periodo: string
  alcance: string
  caducidad: string
  /** null = sin vista previa disponible para ese periodo (p. ej. todo el histórico) */
  kpis: Kpis | null
  estado: EstadoTarjeta
  g: QrGeometria | null
  url: string | null
  /** cambia para repetir la animación de entrada (nuevo enlace seleccionado) */
  claveAnimacion: string
}) {
  const e = ESTADO[estado]
  const items = kpis ? [
    { label: "Peticiones", valor: fmtCompacto(kpis.registros) },
    { label: "Tubos y etiquetas", valor: fmtCompacto(kpis.unidades) },
    { label: "Ciclo · mediana", valor: fmtMin(kpis.p50Total) },
    { label: "Eventos / 1.000", valor: fmtN(kpis.tasaEventos, 1) },
  ] : null

  return (
    <div className={`${s.ink} relative rounded-3xl p-5 shadow-[0_30px_80px_-40px_rgba(7,22,38,.9)]`}>
      <span className={s.aurora} style={{ width: 220, height: 220, right: -60, top: -80, background: "#00A99D" }} />
      <div className="flex items-center justify-between gap-3">
        <BrandLockup />
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.12em] ring-1 ${e.cls}`}>{e.label}</span>
      </div>

      <div key={`cab-${claveAnimacion}`} className={`${s.swap} mt-5`}>
        <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-teal-200">Informe Inteligencia InLab</p>
        <h3 className="mt-1 text-lg font-extrabold leading-tight tracking-[-.02em]">{hospital}</h3>
        <p className="mt-1 text-xs text-slate-300">{periodo}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{alcance}</p>
      </div>

      {items ? (
        <dl key={`kpi-${claveAnimacion}`} className="mt-4 grid grid-cols-2 gap-2">
          {items.map((it, i) => (
            <div key={it.label} className={`${s.rise} rounded-xl border border-white/10 bg-white/[.06] px-3 py-2.5`} style={{ ["--d" as string]: `${60 + i * 50}ms` }}>
              <dt className="text-[10px] font-semibold text-slate-400">{it.label}</dt>
              <dd className="mt-0.5 font-mono text-base font-bold tabular-nums text-white">{it.valor}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2.5 text-[11px] leading-5 text-slate-300">
          Las cifras se calculan al abrir el enlace con todos los datos cargados del hospital (incluidas cargas futuras).
        </p>
      )}

      <div className="mt-5 flex items-center gap-4">
        <div className={`${s.qrFrame} shrink-0 rounded-2xl bg-[#fff] p-2 shadow-[0_16px_40px_-18px_rgba(0,169,157,.7)]`} key={`qr-${claveAnimacion}`}>
          {g && url ? (
            <QrCodigo g={g} tamano={132} etiqueta={`Código QR del enlace ${url}`} />
          ) : (
            <div className="relative flex h-[132px] w-[132px] items-center justify-center">
              <div className={`${s.qrGhost} absolute inset-0`} aria-hidden="true" />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-teal-300 dark:bg-slate-800"><IconLock size={18} /></span>
            </div>
          )}
        </div>
        <div className="min-w-0 text-[11px] leading-5 text-slate-300">
          {g && url ? (
            <>
              <p className="font-bold text-white">Escanea para abrir</p>
              <p className="break-all font-mono text-[10px] text-slate-400">{url.replace(/^https?:\/\//, "")}</p>
            </>
          ) : (
            <>
              <p className="font-bold text-white">El QR aparecerá al generar el enlace</p>
              <p className="text-slate-400">Solo lectura · sin datos de pacientes</p>
            </>
          )}
          <p className="mt-1 text-slate-400">{caducidad}</p>
        </div>
      </div>
    </div>
  )
}
