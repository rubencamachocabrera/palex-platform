import Image from "next/image"
import { TEAL, ORANGE } from "@/lib/brand"

// Nodos de la red: hospitales conectados a la plataforma (coordenadas en viewBox 600x600)
const NODES = [
  { x: 300, y: 300, r: 9, core: true },
  { x: 140, y: 170, r: 5 }, { x: 470, y: 140, r: 6 }, { x: 520, y: 330, r: 4 },
  { x: 430, y: 480, r: 5 }, { x: 210, y: 470, r: 6 }, { x: 90,  y: 330, r: 4 },
  { x: 300, y: 90,  r: 4 }, { x: 560, y: 230, r: 3 }, { x: 40,  y: 230, r: 3 },
  { x: 330, y: 560, r: 3 }, { x: 560, y: 470, r: 3 },
]
const LINKS: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7],
  [1, 7], [2, 8], [3, 8], [4, 11], [5, 10], [6, 9], [1, 9], [4, 10], [2, 7],
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-white">

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL IZQUIERDO — Tinta Nexus con red de hospitales en vivo
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="login-hero hidden lg:flex lg:w-[54%] flex-col relative overflow-hidden text-white">

        {/* Rejilla técnica en deriva */}
        <div className="login-hero-grid absolute inset-0 pointer-events-none" />

        {/* Red de nodos */}
        <svg
          className="absolute pointer-events-none"
          style={{ width: "min(46vw, 720px)", height: "min(46vw, 720px)", right: "-8%", top: "50%", transform: "translateY(-50%)" }}
          viewBox="0 0 600 600"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="nx-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#5ff2e4" stopOpacity="0.9" />
              <stop offset="100%" stopColor={TEAL} stopOpacity="0" />
            </radialGradient>
            <linearGradient id="nx-link" x1="0" x2="1">
              <stop offset="0%" stopColor="#5ff2e4" stopOpacity="0.55" />
              <stop offset="100%" stopColor={ORANGE} stopOpacity="0.35" />
            </linearGradient>
          </defs>
          {/* Órbitas */}
          <g className="login-orbit" opacity="0.5">
            <circle cx="300" cy="300" r="150" fill="none" stroke="rgba(148,197,255,0.16)" strokeDasharray="2 6" />
            <circle cx="300" cy="300" r="250" fill="none" stroke="rgba(148,197,255,0.10)" strokeDasharray="1 9" />
            <circle cx="450" cy="300" r="4" fill={ORANGE} />
            <circle cx="300" cy="50" r="3" fill="#5ff2e4" />
          </g>
          <circle cx="300" cy="300" r="90" fill="url(#nx-core)" opacity="0.35" />
          {LINKS.map(([a, b], i) => (
            <line
              key={i}
              className="login-link-path"
              x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y}
              stroke="url(#nx-link)" strokeWidth="1.2"
              style={{ animationDelay: `${-i * 0.37}s` }}
            />
          ))}
          {NODES.map((n, i) => (
            <g key={i}>
              <circle cx={n.x} cy={n.y} r={n.r * 2.6} fill={n.core ? TEAL : "#5ff2e4"} opacity="0.12" />
              <circle
                className="login-node"
                cx={n.x} cy={n.y} r={n.r}
                fill={n.core ? "#ffffff" : i % 4 === 0 ? ORANGE : "#5ff2e4"}
                style={{ animationDelay: `${i * 0.27}s` }}
              />
            </g>
          ))}
        </svg>

        {/* Filo superior teal → naranja */}
        <div className="absolute top-0 inset-x-0 h-px pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${TEAL}, ${ORANGE}, transparent)` }} />

        {/* ── LOGO ── */}
        <div className="relative z-10 px-12 pt-11 flex items-center gap-3">
          <Image src="/logo-palex.png" alt="Palex Medical" width={110} height={38} priority
            style={{ filter: "brightness(0) invert(1)", opacity: 0.95 }} />
        </div>

        {/* ── CONTENIDO CENTRAL ── */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-12">

          {/* Etiqueta */}
          <div className="inline-flex w-fit items-center gap-2.5 mb-8 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(148,197,255,0.07)", boxShadow: "inset 0 0 0 1px rgba(148,197,255,0.14)" }}>
            <span className="live-dot" aria-hidden="true" />
            <span className="font-mono text-[10.5px] tracking-[0.22em] uppercase" style={{ color: "rgba(226,237,247,0.75)" }}>
              Plataforma interna · {new Date().getFullYear()}
            </span>
          </div>

          {/* InLab — wordmark */}
          <h1 className="login-wordmark font-black leading-[0.9] select-none mb-3"
            style={{ fontSize: "clamp(76px, 7.4vw, 112px)", letterSpacing: "-0.055em" }}>
            InLab
          </h1>

          <p className="font-mono uppercase tracking-[0.3em] mb-10"
            style={{ fontSize: 11.5, color: "#5ff2e4" }}>
            Palex Medical · Command Center
          </p>

          {/* Descripción */}
          <p className="max-w-[340px]" style={{ fontSize: 15, color: "rgba(226,237,247,0.72)", lineHeight: 1.7 }}>
            Gestión integral de proyectos hospitalarios, inventario de hardware y trazabilidad preanalítica en una sola consola.
          </p>

          <div className="flex items-center gap-2 pt-6 mt-8 max-w-[340px]"
            style={{ borderTop: "1px solid rgba(148,197,255,0.12)" }}>
            <span className="font-mono" style={{ fontSize: 10, color: ORANGE, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600 }}>
              Improving technologies
            </span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>·</span>
            <span className="font-mono" style={{ fontSize: 10, color: `${ORANGE}CC`, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600 }}>
              Improving lives
            </span>
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="relative z-10 mx-12 mb-10 grid grid-cols-3 rounded-2xl overflow-hidden"
          style={{ background: "rgba(148,197,255,0.05)", boxShadow: "inset 0 0 0 1px rgba(148,197,255,0.12)", backdropFilter: "blur(12px)" }}>
          {[
            { num: "200+", label: "Hospitales" },
            { num: "100%", label: "Trazabilidad" },
            { num: "24/7", label: "Acceso" },
          ].map((s, i) => (
            <div key={i} className="px-5 py-4" style={{ borderLeft: i > 0 ? "1px solid rgba(148,197,255,0.12)" : undefined }}>
              <p className="font-mono font-semibold text-2xl leading-none tabular-nums" style={{ color: i === 1 ? "#5ff2e4" : ORANGE }}>
                {s.num}
              </p>
              <p className="font-mono text-[10px] mt-2 uppercase tracking-[0.2em]" style={{ color: "rgba(226,237,247,0.55)" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL DERECHO — Formulario
      ══════════════════════════════════════════════════════════════════════ */}
      <main id="main-content" className="flex-1 flex items-center justify-center px-8 py-12 bg-white relative overflow-hidden">

        {/* Halo de marca muy sutil tras el formulario */}
        <div className="absolute pointer-events-none" aria-hidden="true" style={{
          width: 520, height: 520, borderRadius: "50%", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          background: `radial-gradient(circle, ${TEAL}14, transparent 65%)`,
        }} />

        {/* Acento superior — solo móvil */}
        <div className="absolute top-0 left-0 right-0 h-1 lg:hidden"
          style={{ background: `linear-gradient(90deg, ${TEAL}, ${ORANGE})` }} />

        <div className="relative z-10 w-full flex justify-center">
          {children}
        </div>
      </main>
    </div>
  )
}
