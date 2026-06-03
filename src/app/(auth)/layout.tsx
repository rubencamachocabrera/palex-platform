import Image from "next/image"
import { TEAL, ORANGE } from "@/lib/brand"

const TEAL_DARK = "#007A70"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-white">

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL IZQUIERDO — Color sólido teal con tipografía blanca
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[54%] flex-col relative overflow-hidden"
        style={{ background: `linear-gradient(148deg, #00bfb3 0%, ${TEAL} 45%, ${TEAL_DARK} 100%)` }}>

        {/* Círculo decorativo grande — blanco semitransparente */}
        <div className="absolute pointer-events-none" style={{
          width: 480, height: 480, borderRadius: "50%",
          background: "rgba(255,255,255,0.07)",
          bottom: -120, right: -100,
        }} />
        <div className="absolute pointer-events-none" style={{
          width: 280, height: 280, borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
          bottom: -60, right: 60,
        }} />

        {/* Línea naranja diagonal — acento */}
        <div className="absolute pointer-events-none" style={{
          top: 0, right: 0, width: "100%", height: "3px",
          background: `linear-gradient(90deg, transparent 30%, ${ORANGE} 100%)`,
        }} />

        {/* Puntos decorativos — patrón sutil */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.5,
        }} />

        {/* ── LOGO ── */}
        <div className="relative z-10 px-12 pt-11">
          <Image src="/logo-palex.png" alt="Palex Medical" width={110} height={38} priority
            style={{ filter: "brightness(0) invert(1)", opacity: 0.92 }} />
        </div>

        {/* ── CONTENIDO CENTRAL ── */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-12">

          {/* Etiqueta */}
          <div className="flex items-center gap-2.5 mb-7">
            <div className="w-5 h-0.5 rounded-full" style={{ backgroundColor: ORANGE }} />
            <span className="text-[10px] font-bold tracking-[0.32em] uppercase"
              style={{ color: "rgba(255,255,255,0.65)" }}>
              Plataforma interna · {new Date().getFullYear()}
            </span>
          </div>

          {/* InLab — wordmark principal en blanco */}
          <h1 className="font-black leading-none select-none mb-2"
            style={{
              fontSize: "clamp(72px, 7vw, 96px)",
              color: "#ffffff",
              letterSpacing: "-0.04em",
            }}>
            InLab
          </h1>

          {/* Palex Medical */}
          <p className="font-semibold uppercase tracking-[0.22em] mb-8"
            style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
            Palex Medical
          </p>

          {/* Separador naranja */}
          <div className="flex items-center gap-2 mb-8" style={{ width: 160 }}>
            <div className="flex-1 h-0.5 rounded-full" style={{ backgroundColor: ORANGE, opacity: 0.85 }} />
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ORANGE, opacity: 0.85 }} />
          </div>

          {/* Descripción */}
          <div className="space-y-1.5 max-w-[300px]">
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.70)", lineHeight: 1.7 }}>
              Gestión integral de proyectos hospitalarios,
            </p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.50)", lineHeight: 1.7 }}>
              inventario de hardware y trazabilidad preanalítica.
            </p>

            {/* Tagline Palex */}
            <div className="flex items-center gap-2 pt-5 mt-2"
              style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
              <span style={{ fontSize: 10, color: ORANGE, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>
                Improving technologies
              </span>
              <span style={{ color: "rgba(255,255,255,0.30)", fontSize: 12 }}>·</span>
              <span style={{ fontSize: 10, color: `${ORANGE}CC`, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>
                Improving lives
              </span>
            </div>
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="relative z-10 px-12 py-7 flex items-center gap-10"
          style={{ borderTop: "1px solid rgba(255,255,255,0.14)" }}>
          {[
            { num: "200+", label: "Hospitales" },
            { num: "100%", label: "Trazabilidad" },
            { num: "24/7", label: "Acceso" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-4">
              {i > 0 && (
                <div className="w-px h-7 shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.20)" }} />
              )}
              <div>
                <p className="font-black text-xl leading-none tabular-nums"
                  style={{ color: ORANGE }}>
                  {s.num}
                </p>
                <p className="text-[10px] mt-1.5 uppercase tracking-widest font-semibold"
                  style={{ color: "rgba(255,255,255,0.50)" }}>
                  {s.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL DERECHO — Blanco limpio con formulario
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 bg-white relative">

        {/* Sombra sutil entre paneles */}
        <div className="absolute left-0 top-0 bottom-0 w-px hidden lg:block"
          style={{ background: "rgba(0,0,0,0.06)" }} />

        {/* Acento naranja top — solo móvil */}
        <div className="absolute top-0 left-0 right-0 h-1 lg:hidden"
          style={{ background: `linear-gradient(90deg, ${TEAL}, ${ORANGE})` }} />

        {children}
      </div>
    </div>
  )
}
