import Image from "next/image"
import { TEAL, ORANGE } from "@/lib/brand"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: "#05111d" }}>

      {/* ════════════════════════════════════════════════
          PANEL IZQUIERDO — Diseño lineal con profundidad
      ════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden">

        {/* Base oscura con tinte verde corporativo */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(160deg, #040e1a 0%, #061422 50%, #071928 100%)" }} />

        {/* ── Elemento de profundidad: círculos concéntricos ── */}
        <svg className="absolute" aria-hidden="true"
          style={{ top: "50%", left: "50%", transform: "translate(-44%, -52%)", width: "90%", maxWidth: 520, opacity: 1 }}
          viewBox="0 0 520 520">
          {/* Círculo exterior — muy sutil */}
          <circle cx="260" cy="260" r="248" fill="none" stroke={TEAL} strokeWidth="0.4" opacity="0.12" />
          {/* Círculo medio */}
          <circle cx="260" cy="260" r="192" fill="none" stroke={TEAL} strokeWidth="0.5" opacity="0.18" />
          {/* Círculo interior — más visible */}
          <circle cx="260" cy="260" r="136" fill="none" stroke={TEAL} strokeWidth="0.7" opacity="0.25" />
          {/* Pequeño núcleo */}
          <circle cx="260" cy="260" r="72" fill="none" stroke={ORANGE} strokeWidth="0.6" opacity="0.2" />
          {/* Cruz de precisión */}
          <line x1="260" y1="20" x2="260" y2="500" stroke={TEAL} strokeWidth="0.3" opacity="0.08" />
          <line x1="20" y1="260" x2="500" y2="260" stroke={TEAL} strokeWidth="0.3" opacity="0.08" />
          {/* Cuatro puntos cardinales en el círculo medio */}
          <circle cx="260" cy="68" r="2.5" fill={ORANGE} opacity="0.5" />
          <circle cx="452" cy="260" r="2.5" fill={TEAL} opacity="0.5" />
          <circle cx="260" cy="452" r="2" fill={TEAL} opacity="0.35" />
          <circle cx="68" cy="260" r="2" fill={ORANGE} opacity="0.35" />
        </svg>

        {/* ── Líneas verticales de profundidad (perspectiva) ── */}
        <svg className="absolute inset-0 w-full h-full" aria-hidden="true" style={{ opacity: 0.06 }}>
          {[0, 14, 28, 42, 57, 71, 85, 100].map((x, i) => (
            <line key={i} x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%"
              stroke="white" strokeWidth="0.5" />
          ))}
        </svg>

        {/* ── Línea acento naranja horizontal ── */}
        <div className="absolute left-0 right-0" style={{ top: "38%", height: "1px",
          background: `linear-gradient(90deg, transparent 0%, ${ORANGE} 30%, ${ORANGE} 70%, transparent 100%)`,
          opacity: 0.15 }} />

        {/* ── Glow verde tenue desde el centro-izquierda ── */}
        <div className="absolute pointer-events-none"
          style={{ top: "30%", left: "20%", width: 400, height: 400, borderRadius: "50%",
            background: `radial-gradient(circle, ${TEAL}12 0%, transparent 65%)`,
            transform: "translate(-30%, -30%)" }} />

        {/* ── Logo — esquina superior izquierda ── */}
        <div className="relative z-10 p-10">
          <div className="inline-flex items-center gap-2">
            <div className="h-7 w-px" style={{ backgroundColor: TEAL, opacity: 0.6 }} />
            <Image src="/logo-palex.png" alt="Palex Medical" width={110} height={38} priority
              style={{ filter: "brightness(0) invert(1)", opacity: 0.75 }} />
          </div>
        </div>

        {/* ── Contenido central ── */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-12">

          {/* Etiqueta superior */}
          <div className="flex items-center gap-3 mb-8">
            <span className="w-5 h-px" style={{ backgroundColor: ORANGE, opacity: 0.8 }} />
            <p className="text-[10px] font-bold tracking-[0.35em] uppercase"
              style={{ color: "rgba(255,255,255,0.38)" }}>
              Plataforma interna · {new Date().getFullYear()}
            </p>
          </div>

          {/* INLAB — el protagonista */}
          <h1 className="font-black leading-none tracking-tighter select-none mb-1"
            style={{
              fontSize: "clamp(80px, 8vw, 104px)",
              color: TEAL,
              letterSpacing: "-0.03em",
            }}>
            InLab
          </h1>

          {/* PALEX MEDICAL debajo, más pequeño */}
          <p className="font-semibold tracking-[0.22em] uppercase mb-8"
            style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", letterSpacing: "0.22em" }}>
            Palex Medical
          </p>

          {/* Separador con línea naranja */}
          <div className="flex items-center gap-0 mb-8" style={{ width: 200 }}>
            <div className="h-px flex-1" style={{ backgroundColor: ORANGE, opacity: 0.7 }} />
            <div className="w-1.5 h-1.5 rounded-full shrink-0 ml-1.5" style={{ backgroundColor: ORANGE, opacity: 0.7 }} />
          </div>

          {/* Descripción */}
          <div className="space-y-2 max-w-xs">
            <p className="text-sm leading-relaxed"
              style={{ color: "rgba(255,255,255,0.45)", letterSpacing: "0.01em" }}>
              Gestión integral de proyectos hospitalarios,
            </p>
            <p className="text-sm leading-relaxed"
              style={{ color: "rgba(255,255,255,0.3)" }}>
              inventario de hardware y trazabilidad preanalítica.
            </p>
            <p className="text-xs mt-3 pt-3" style={{ color: "rgba(255,255,255,0.2)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              Herramienta de uso interno · Acceso restringido
            </p>
          </div>
        </div>

        {/* ── Stats — parte inferior ── */}
        <div className="relative z-10 px-12 py-7 flex items-center gap-8"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {[
            { num: "200+", label: "Hospitales" },
            { num: "100%", label: "Trazabilidad" },
            { num: "24/7", label: "Acceso" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              {i > 0 && <div className="w-px h-7 shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.07)" }} />}
              <div>
                <p className="font-bold text-lg leading-none tabular-nums" style={{ color: TEAL }}>{s.num}</p>
                <p className="text-[10px] mt-1.5 uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.28)" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          PANEL DERECHO — Formulario
      ════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center p-8 relative"
        style={{ background: "linear-gradient(160deg, #040e1a 0%, #060f1d 100%)" }}>

        {/* Línea divisoria sutil entre paneles */}
        <div className="absolute left-0 top-12 bottom-12 w-px hidden lg:block"
          style={{ background: `linear-gradient(180deg, transparent, ${TEAL}30, ${ORANGE}30, transparent)` }} />

        {/* Pequeño glow de profundidad detrás del form */}
        <div className="absolute pointer-events-none"
          style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 340, height: 340, borderRadius: "50%",
            background: `radial-gradient(circle, ${TEAL}08 0%, transparent 70%)` }} />

        {children}
      </div>
    </div>
  )
}
