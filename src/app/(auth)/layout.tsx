import Image from "next/image"
import { TEAL, ORANGE } from "@/lib/brand"

const BG   = "#030d18"
const BG_L = "#040f1e"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: BG }}>

      {/* ── Keyframe animations ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes lscan {
          0%   { top: -2px; opacity: 0; }
          3%   { opacity: 1; }
          97%  { opacity: 0.8; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes lring-cw  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes lring-ccw { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes lpulse-a  { 0%,100%{ opacity:.10; } 50%{ opacity:.30; } }
        @keyframes lpulse-b  { 0%,100%{ opacity:.15; } 50%{ opacity:.40; } }
        @keyframes lglow     { 0%,100%{ opacity:.22; } 50%{ opacity:.52; } }
        @keyframes lblink    { 0%,49% { opacity:1;   } 50%,100%{ opacity:.08; } }
        @keyframes ldot      { 0%,100%{ transform:scale(1); opacity:.55; } 50%{ transform:scale(2.2); opacity:1; } }

        .lscan-line {
          position:absolute; left:0; right:0; height:1px; z-index:5; pointer-events:none;
          background: linear-gradient(90deg, transparent 0%, ${TEAL}55 20%, ${TEAL}99 50%, ${TEAL}55 80%, transparent 100%);
          box-shadow: 0 0 12px 2px ${TEAL}40, 0 0 30px 6px ${TEAL}18;
          animation: lscan 8s linear infinite;
        }
        .lring-cw  { transform-origin: 260px 260px; animation: lring-cw  26s linear infinite; }
        .lring-ccw { transform-origin: 260px 260px; animation: lring-ccw 18s linear infinite; }
        .lpulse-a  { animation: lpulse-a 5s ease-in-out infinite; }
        .lpulse-b  { animation: lpulse-b 4s ease-in-out infinite 0.8s; }
        .lglow     { animation: lglow    6s ease-in-out infinite; }
        .lblink    { animation: lblink   1.4s step-end infinite; }
        .ldot      { animation: ldot     2.6s ease-in-out infinite; }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL IZQUIERDO — InLab HUD Command Center
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden"
        style={{ background: `linear-gradient(148deg, ${BG_L} 0%, #051728 55%, #030f1c 100%)` }}>

        {/* Dot grid texture */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle, rgba(0,169,157,0.22) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
          opacity: 0.30,
        }} />

        {/* Vertical structural lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true"
          style={{ opacity: 0.035 }}>
          {[0, 16.6, 33.3, 50, 66.6, 83.3, 100].map((x, i) => (
            <line key={i} x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%"
              stroke="white" strokeWidth="0.5" />
          ))}
        </svg>

        {/* HUD corner brackets */}
        <div className="absolute top-5 left-5 w-8 h-8 pointer-events-none"
          style={{ borderTop: `2px solid ${TEAL}80`, borderLeft: `2px solid ${TEAL}80` }} />
        <div className="absolute top-5 right-5 w-8 h-8 pointer-events-none"
          style={{ borderTop: `2px solid ${ORANGE}60`, borderRight: `2px solid ${ORANGE}60` }} />
        <div className="absolute bottom-5 left-5 w-8 h-8 pointer-events-none"
          style={{ borderBottom: `2px solid ${TEAL}55`, borderLeft: `2px solid ${TEAL}55` }} />
        <div className="absolute bottom-5 right-5 w-8 h-8 pointer-events-none"
          style={{ borderBottom: `2px solid ${ORANGE}45`, borderRight: `2px solid ${ORANGE}45` }} />

        {/* Scan line */}
        <div className="lscan-line" />

        {/* ── RADAR SVG ── */}
        <svg className="absolute pointer-events-none" aria-hidden="true"
          style={{ top: "50%", left: "50%", transform: "translate(-46%, -52%)", width: "84%", maxWidth: 500 }}
          viewBox="0 0 520 520">

          {/* SVG defs — glows */}
          <defs>
            <radialGradient id="cg1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={TEAL} stopOpacity="0.18" />
              <stop offset="100%" stopColor={TEAL} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="cg2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={ORANGE} stopOpacity="0.10" />
              <stop offset="100%" stopColor={ORANGE} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Outer glow fill */}
          <circle cx="260" cy="260" r="240" fill="url(#cg1)" />

          {/* Ring 1 — outermost, very subtle pulse */}
          <circle cx="260" cy="260" r="248" fill="none" stroke={TEAL}
            strokeWidth="0.4" className="lpulse-a" />

          {/* Ring 2 — rotating CW dashed */}
          <g className="lring-cw">
            <circle cx="260" cy="260" r="208" fill="none" stroke={TEAL}
              strokeWidth="0.9" strokeDasharray="7 16" opacity="0.24" />
          </g>

          {/* Ring 3 — rotating CCW dashed orange */}
          <g className="lring-ccw">
            <circle cx="260" cy="260" r="166" fill="none" stroke={ORANGE}
              strokeWidth="0.7" strokeDasharray="4 22" opacity="0.22" />
          </g>

          {/* Ring 4 — static inner pulse */}
          <circle cx="260" cy="260" r="128" fill="none" stroke={TEAL}
            strokeWidth="0.6" className="lpulse-b" />

          {/* Ring 5 — nucleus */}
          <circle cx="260" cy="260" r="76" fill="none" stroke={TEAL}
            strokeWidth="0.5" opacity="0.38" />

          {/* Ring 6 — orange inner */}
          <circle cx="260" cy="260" r="34" fill="none" stroke={ORANGE}
            strokeWidth="0.9" opacity="0.32" />

          {/* Center glow */}
          <circle cx="260" cy="260" r="90" fill="url(#cg2)" />

          {/* Center dot */}
          <circle cx="260" cy="260" r="4" fill={TEAL} opacity="0.85" />
          <circle cx="260" cy="260" r="9" fill="none" stroke={TEAL}
            strokeWidth="0.8" opacity="0.55" />

          {/* Cross-hair */}
          <line x1="260" y1="6"   x2="260" y2="514" stroke={TEAL} strokeWidth="0.3" opacity="0.07" />
          <line x1="6"   y1="260" x2="514" y2="260" stroke={TEAL} strokeWidth="0.3" opacity="0.07" />
          <line x1="78"  y1="78"  x2="442" y2="442" stroke="white" strokeWidth="0.2" opacity="0.035" />
          <line x1="442" y1="78"  x2="78"  y2="442" stroke="white" strokeWidth="0.2" opacity="0.035" />

          {/* Tick marks on ring 1 (every 15°) */}
          {Array.from({ length: 24 }).map((_, i) => {
            const a   = (i * 15) * Math.PI / 180
            const r1  = 248
            const r2  = i % 6 === 0 ? 234 : 241
            const x1  = 260 + r1 * Math.cos(a)
            const y1  = 260 + r1 * Math.sin(a)
            const x2  = 260 + r2 * Math.cos(a)
            const y2  = 260 + r2 * Math.sin(a)
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={TEAL}
                strokeWidth={i % 6 === 0 ? "1.2" : "0.5"}
                opacity={i % 6 === 0 ? 0.55 : 0.22} />
            )
          })}

          {/* Cardinal dots */}
          <circle cx="260" cy="50"  r="3.2" fill={ORANGE} opacity="0.75" />
          <circle cx="470" cy="260" r="3.2" fill={TEAL}   opacity="0.75" />
          <circle cx="260" cy="470" r="2.6" fill={TEAL}   opacity="0.50" />
          <circle cx="50"  cy="260" r="2.6" fill={ORANGE} opacity="0.50" />

          {/* Diamond markers at 45° */}
          {([[376, 144], [376, 376], [144, 376], [144, 144]] as [number, number][]).map(([x, y], i) => (
            <rect key={i} x={x - 3.5} y={y - 3.5} width="7" height="7"
              fill="none"
              stroke={i % 2 === 0 ? TEAL : ORANGE}
              strokeWidth="0.8"
              opacity="0.38"
              transform={`rotate(45, ${x}, ${y})`} />
          ))}

          {/* Small data labels at cardinal ticks */}
          <text x="256" y="42"  fontSize="7" fill={ORANGE} opacity="0.45" textAnchor="middle" fontFamily="monospace">N</text>
          <text x="476" y="263" fontSize="7" fill={TEAL}   opacity="0.45" textAnchor="start"  fontFamily="monospace">E</text>
        </svg>

        {/* Teal glow — upper center */}
        <div className="absolute lglow pointer-events-none" style={{
          top: "18%", left: "34%",
          width: 380, height: 380, borderRadius: "50%",
          background: `radial-gradient(circle, ${TEAL}18 0%, transparent 65%)`,
          transform: "translate(-30%, -20%)",
          filter: "blur(12px)",
        }} />

        {/* Orange glow — lower right */}
        <div className="absolute pointer-events-none" style={{
          bottom: "8%", right: "6%",
          width: 180, height: 180, borderRadius: "50%",
          background: `radial-gradient(circle, ${ORANGE}12 0%, transparent 70%)`,
          filter: "blur(16px)",
        }} />

        {/* Orange horizontal accent */}
        <div className="absolute left-0 right-0 pointer-events-none" style={{
          top: "41%", height: "1px",
          background: `linear-gradient(90deg, transparent 0%, ${ORANGE}45 28%, ${ORANGE}65 50%, ${ORANGE}45 72%, transparent 100%)`,
        }} />

        {/* ── LOGO — top left ── */}
        <div className="relative z-10 p-10">
          <div className="inline-flex items-center gap-3">
            <span className="ldot w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: TEAL, boxShadow: `0 0 8px ${TEAL}` }} />
            <div className="w-px h-6" style={{ backgroundColor: `${TEAL}55` }} />
            <Image src="/logo-palex.png" alt="Palex Medical" width={108} height={38} priority
              style={{ filter: "brightness(0) invert(1)", opacity: 0.68 }} />
          </div>
          <div className="flex items-center gap-2 mt-2.5 ml-1">
            <span className="text-[9px] tracking-[0.28em] uppercase"
              style={{ color: `${TEAL}70`, fontFamily: "var(--font-geist-mono, monospace)" }}>
              SYS.READY
            </span>
            <span className="lblink text-[9px]"
              style={{ color: ORANGE, fontFamily: "monospace" }}>▋</span>
          </div>
        </div>

        {/* ── CENTRAL CONTENT ── */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-12">

          {/* Breadcrumb label */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-px" style={{ backgroundColor: ORANGE, opacity: 0.75 }} />
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ORANGE, opacity: 0.75 }} />
            </div>
            <p className="text-[9px] font-bold tracking-[0.38em] uppercase"
              style={{ color: "rgba(255,255,255,0.32)", fontFamily: "var(--font-geist-mono, monospace)" }}>
              Plataforma interna · {new Date().getFullYear()}
            </p>
          </div>

          {/* InLab — hero wordmark with glow */}
          <div className="relative">
            <div className="absolute inset-0 pointer-events-none" style={{
              background: `radial-gradient(ellipse at 15% 50%, ${TEAL}22 0%, transparent 55%)`,
              filter: "blur(24px)",
            }} />
            <h1 className="relative font-black leading-none select-none"
              style={{
                fontSize: "clamp(70px, 7.2vw, 98px)",
                color: TEAL,
                letterSpacing: "-0.04em",
                textShadow: `0 0 40px ${TEAL}70, 0 0 80px ${TEAL}35, 0 0 120px ${TEAL}18`,
                fontFamily: "var(--font-geist-mono, monospace)",
              }}>
              InLab
            </h1>
          </div>

          {/* PALEX MEDICAL */}
          <p className="font-semibold tracking-[0.28em] uppercase mt-1.5 mb-7"
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.38)",
              fontFamily: "var(--font-geist-mono, monospace)",
            }}>
            Palex Medical
          </p>

          {/* Orange separator line */}
          <div className="flex items-center mb-7" style={{ width: 190 }}>
            <div className="h-px flex-1" style={{ backgroundColor: ORANGE, opacity: 0.60 }} />
            <div className="w-1.5 h-1.5 rounded-full shrink-0 mx-1.5"
              style={{ backgroundColor: ORANGE, opacity: 0.60 }} />
            <div className="w-4 h-px shrink-0"
              style={{ backgroundColor: ORANGE, opacity: 0.28 }} />
          </div>

          {/* Description */}
          <div className="space-y-1.5 max-w-[280px]">
            <p style={{
              fontSize: 12.5, color: "rgba(255,255,255,0.38)", lineHeight: 1.65,
              fontFamily: "var(--font-geist-mono, monospace)",
            }}>
              Gestión integral de proyectos hospitalarios,
            </p>
            <p style={{
              fontSize: 12.5, color: "rgba(255,255,255,0.24)", lineHeight: 1.65,
              fontFamily: "var(--font-geist-mono, monospace)",
            }}>
              inventario de hardware y trazabilidad preanalítica.
            </p>
            {/* Tagline */}
            <div className="flex items-center gap-2 mt-4 pt-4"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{
                fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase",
                color: `${ORANGE}95`, fontFamily: "var(--font-geist-mono, monospace)",
              }}>
                Improving technologies
              </span>
              <span style={{ color: "rgba(255,255,255,0.14)", fontSize: 11 }}>·</span>
              <span style={{
                fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase",
                color: `${ORANGE}70`, fontFamily: "var(--font-geist-mono, monospace)",
              }}>
                Improving lives
              </span>
            </div>
          </div>
        </div>

        {/* ── STATS BAR ── */}
        <div className="relative z-10 px-12 py-6 flex items-center gap-8"
          style={{ borderTop: "1px solid rgba(255,255,255,0.045)" }}>
          {[
            { num: "200+", label: "Hospitales", color: TEAL },
            { num: "100%", label: "Trazabilidad", color: ORANGE },
            { num: "24/7", label: "Acceso", color: TEAL },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              {i > 0 && (
                <div className="w-px h-6 shrink-0"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
              )}
              <div>
                <p className="font-bold text-base leading-none tabular-nums"
                  style={{
                    color: s.color,
                    textShadow: `0 0 14px ${s.color}65`,
                    fontFamily: "var(--font-geist-mono, monospace)",
                  }}>
                  {s.num}
                </p>
                <p className="text-[9px] mt-1.5 uppercase tracking-widest"
                  style={{
                    color: "rgba(255,255,255,0.24)",
                    fontFamily: "var(--font-geist-mono, monospace)",
                  }}>
                  {s.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL DERECHO — Formulario
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center p-8 relative"
        style={{ background: `linear-gradient(158deg, ${BG} 0%, #04111f 100%)` }}>

        {/* Dot grid — more subtle */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle, rgba(0,169,157,0.14) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
          opacity: 0.22,
        }} />

        {/* Panel divider */}
        <div className="absolute left-0 top-14 bottom-14 w-px hidden lg:block"
          style={{ background: `linear-gradient(180deg, transparent, ${TEAL}38, ${ORANGE}28, transparent)` }} />

        {/* Ambient form glow */}
        <div className="absolute pointer-events-none" style={{
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: 400, height: 400, borderRadius: "50%",
          background: `radial-gradient(circle, ${TEAL}0C 0%, transparent 68%)`,
          filter: "blur(8px)",
        }} />

        {children}
      </div>
    </div>
  )
}
