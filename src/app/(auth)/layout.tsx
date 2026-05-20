import Image from "next/image"
import { TEAL, ORANGE } from "@/lib/brand"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo ───────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden"
        style={{ background: `linear-gradient(150deg, #005952 0%, #007A73 45%, ${TEAL} 100%)` }}
      >
        {/* Dot grid texture */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.05 }} aria-hidden="true">
          <defs>
            <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="1.5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        {/* Radial soft glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 65% 55% at 48% 52%, rgba(255,255,255,0.07) 0%, transparent 70%)" }}
        />

        {/* Corner accent — bottom-right */}
        <div
          className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${ORANGE}22 0%, transparent 70%)` }}
        />

        {/* Logo — top left */}
        <div className="relative z-10 p-10 pb-0">
          <div className="inline-flex items-center bg-white rounded-2xl px-4 py-2.5 shadow-xl shadow-black/20">
            <Image src="/logo-palex.png" alt="Palex Medical" width={130} height={44} priority />
          </div>
        </div>

        {/* Hero text — centered */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-12">
          <p className="text-[11px] font-bold tracking-[0.28em] uppercase mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Plataforma interna
          </p>

          <h1
            className="font-black leading-none tracking-tight mb-3 select-none"
            style={{ fontSize: "clamp(72px, 7vw, 96px)", color: ORANGE, textShadow: `0 0 60px ${ORANGE}44` }}
          >
            InLab
          </h1>

          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 max-w-[48px]" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
            <p className="text-xl font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>Palex Medical</p>
          </div>

          <p className="text-sm leading-relaxed max-w-xs" style={{ color: "rgba(255,255,255,0.32)" }}>
            Gestión integral de proyectos hospitalarios, inventario y ventas preanalíticas
          </p>
        </div>

        {/* Stats — bottom */}
        <div className="relative z-10 flex gap-10 px-12 py-8" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {[
            { num: "200+", label: "Hospitales" },
            { num: "3",    label: "Equipos" },
            { num: "100%", label: "Trazabilidad" },
          ].map(s => (
            <div key={s.label}>
              <p className="text-white font-bold text-xl leading-none">{s.num}</p>
              <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.38)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Panel derecho — formulario ─────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        {children}
      </div>

    </div>
  )
}
