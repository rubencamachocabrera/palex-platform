import Image from "next/image"

// ─── Parámetros de la red molecular ──────────────────────────────────────────
const NODES = [
  { cx: 18,  cy: 22,  r: 3,   glow: true,  color: "#00A99D" },
  { cx: 42,  cy: 14,  r: 2,   glow: false, color: "#00A99D" },
  { cx: 62,  cy: 30,  r: 3.5, glow: true,  color: "#F7941D" },
  { cx: 78,  cy: 18,  r: 2,   glow: false, color: "#00A99D" },
  { cx: 88,  cy: 46,  r: 2.5, glow: false, color: "#00A99D" },
  { cx: 70,  cy: 58,  r: 4,   glow: true,  color: "#00A99D" },
  { cx: 50,  cy: 52,  r: 2,   glow: false, color: "#F7941D" },
  { cx: 30,  cy: 44,  r: 3,   glow: false, color: "#00A99D" },
  { cx: 12,  cy: 60,  r: 2,   glow: false, color: "#00A99D" },
  { cx: 22,  cy: 76,  r: 3.5, glow: true,  color: "#F7941D" },
  { cx: 46,  cy: 70,  r: 2,   glow: false, color: "#00A99D" },
  { cx: 68,  cy: 78,  r: 2.5, glow: false, color: "#00A99D" },
  { cx: 86,  cy: 68,  r: 3,   glow: true,  color: "#00A99D" },
  { cx: 38,  cy: 88,  r: 2,   glow: false, color: "#00A99D" },
  { cx: 60,  cy: 92,  r: 3,   glow: false, color: "#F7941D" },
  { cx: 82,  cy: 88,  r: 2,   glow: false, color: "#00A99D" },
  { cx: 8,   cy: 40,  r: 2,   glow: false, color: "#00A99D" },
  { cx: 94,  cy: 30,  r: 2,   glow: false, color: "#00A99D" },
]
const EDGES = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[2,5],[5,6],[6,7],[7,0],[7,8],[8,9],
  [9,10],[10,6],[10,11],[11,12],[5,12],[9,13],[13,14],[14,10],[14,15],
  [12,15],[7,16],[3,17],[4,17],
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: "#060d18" }}>

      {/* ── PANEL IZQUIERDO — Arte abstracto molecular ───────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col relative overflow-hidden">

        {/* Fondo de base con gradiente */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #040b15 0%, #071525 40%, #0a1e32 70%, #071525 100%)" }} />

        {/* Grid hexagonal de fondo — muy sutil */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }} aria-hidden="true">
          <defs>
            <pattern id="hex" x="0" y="0" width="52" height="60" patternUnits="userSpaceOnUse">
              <polygon points="26,4 48,16 48,44 26,56 4,44 4,16" fill="none" stroke="white" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex)" />
        </svg>

        {/* Red molecular SVG (responsive, viewBox % ) */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <radialGradient id="gTeal" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00A99D" stopOpacity="1" />
              <stop offset="100%" stopColor="#00A99D" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="gOrange" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F7941D" stopOpacity="1" />
              <stop offset="100%" stopColor="#F7941D" stopOpacity="0" />
            </radialGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-lg" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Edges — líneas de conexión */}
          {EDGES.map(([a, b], i) => (
            <line key={i}
              x1={NODES[a].cx} y1={NODES[a].cy}
              x2={NODES[b].cx} y2={NODES[b].cy}
              stroke="rgba(0,169,157,0.18)" strokeWidth="0.3" strokeLinecap="round" />
          ))}

          {/* Nodos — con animaciones escalonadas */}
          {NODES.map((n, i) => (
            <g key={i}>
              {n.glow && (
                <circle cx={n.cx} cy={n.cy} r={n.r * 3}
                  fill={n.color} opacity="0.06"
                  filter="url(#glow-lg)"
                  style={{ animation: `pulseNode ${3 + (i % 3)}s ease-in-out infinite`, animationDelay: `${i * 0.4}s` }} />
              )}
              <circle cx={n.cx} cy={n.cy} r={n.r}
                fill={n.color}
                opacity={n.glow ? "0.9" : "0.5"}
                filter={n.glow ? "url(#glow)" : undefined}
                style={n.glow ? { animation: `pulseNode ${2.5 + (i % 4)}s ease-in-out infinite`, animationDelay: `${i * 0.3}s` } : {}} />
            </g>
          ))}

          {/* Anillos orbitales abstractos */}
          <circle cx="70" cy="58" r="8" fill="none" stroke="#00A99D" strokeWidth="0.2" opacity="0.3"
            style={{ animation: "rotateSlow 20s linear infinite", transformOrigin: "70px 58px" }} />
          <circle cx="70" cy="58" r="14" fill="none" stroke="#00A99D" strokeWidth="0.15" opacity="0.15"
            style={{ animation: "rotateSlow 35s linear infinite reverse", transformOrigin: "70px 58px" }} />
          <circle cx="22" cy="76" r="6" fill="none" stroke="#F7941D" strokeWidth="0.2" opacity="0.25"
            style={{ animation: "rotateSlow 25s linear infinite", transformOrigin: "22px 76px" }} />
        </svg>

        {/* Glow central teal grande */}
        <div className="absolute pointer-events-none"
          style={{ top: "35%", left: "55%", width: 320, height: 320, borderRadius: "50%", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(0,169,157,0.08) 0%, transparent 70%)" }} />

        {/* Glow orange inferior izquierda */}
        <div className="absolute pointer-events-none"
          style={{ bottom: "-60px", left: "10%", width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(247,148,29,0.07) 0%, transparent 70%)" }} />

        {/* Logo — top left */}
        <div className="relative z-10 p-10">
          <div className="inline-flex items-center bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-2.5">
            <Image src="/logo-palex.png" alt="Palex Medical" width={120} height={40} priority />
          </div>
        </div>

        {/* Texto hero central */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-12">
          <p className="text-[10px] font-bold tracking-[0.35em] uppercase mb-6" style={{ color: "rgba(0,169,157,0.6)" }}>
            Plataforma interna · {new Date().getFullYear()}
          </p>

          {/* InLab con gradiente */}
          <div className="mb-2">
            <span className="font-black leading-none tracking-tighter select-none"
              style={{
                fontSize: "clamp(64px, 6vw, 88px)",
                background: "linear-gradient(135deg, #00A99D 0%, #00d4c8 40%, #F7941D 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 24px rgba(0,169,157,0.35))",
              }}>
              InLab
            </span>
          </div>

          <p className="text-lg font-light tracking-widest mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>
            PALEX MEDICAL
          </p>

          {/* Separator */}
          <div className="flex items-center gap-3 mb-6 w-64">
            <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(0,169,157,0.5), transparent)" }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#F7941D" }} />
          </div>

          <p className="text-sm leading-relaxed max-w-xs" style={{ color: "rgba(255,255,255,0.28)", letterSpacing: "0.02em" }}>
            Gestión integral de proyectos hospitalarios,<br />inventario de hardware y trazabilidad preanalítica.
          </p>
        </div>

        {/* Stats — bottom */}
        <div className="relative z-10 flex gap-8 px-12 py-7"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.15)" }}>
          {[
            { num: "200+", label: "Hospitales" },
            { num: "100%", label: "Trazabilidad" },
            { num: "24/7",  label: "Acceso" },
          ].map(s => (
            <div key={s.label}>
              <p className="font-bold text-lg leading-none" style={{ color: "#00A99D" }}>{s.num}</p>
              <p className="text-[10px] mt-1.5 tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── PANEL DERECHO — Formulario ───────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #070f1c 0%, #0a1525 100%)" }}>

        {/* Glow decorativo en el panel del formulario */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(0,169,157,0.05) 0%, transparent 70%)" }} />

        {children}
      </div>

      {/* ── Animaciones CSS ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes pulseNode {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
