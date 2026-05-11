import { TEAL } from "@/lib/brand"

// Layout para rutas de autenticación — split screen con branding
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo — branding ──────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: TEAL }}
      >
        {/* Círculos decorativos de fondo */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
          style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
        />
        <div
          className="absolute top-1/3 -left-16 w-64 h-64 rounded-full opacity-10"
          style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="text-white font-semibold text-lg">Palex Medical</span>
        </div>

        {/* Cita */}
        <div className="relative z-10">
          <blockquote className="text-white text-3xl font-light leading-relaxed mb-4" style={{ opacity: 0.95 }}>
            "Improving technologies,<br />improving lives."
          </blockquote>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
            Plataforma interna de gestión de proyectos y ventas preanalíticas
          </p>
        </div>

        {/* Stats */}
        <div className="relative z-10 flex gap-8">
          {[
            { num: "200+", label: "Hospitales" },
            { num: "3",    label: "Equipos" },
            { num: "100%", label: "Trazabilidad" },
          ].map(s => (
            <div key={s.label}>
              <p className="text-white font-bold text-2xl">{s.num}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Ondas CSS animadas ── */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden" style={{ height: 130, zIndex: 1 }}>
          {/* wave-track: 200% de ancho (2 copias), se desplaza -50% = un ciclo perfecto */}
          <div className="wave-track" style={{ width: "200%", height: "100%", display: "flex" }}>
            {[0, 1].map(i => (
              <svg
                key={i}
                viewBox="0 0 1440 130"
                preserveAspectRatio="none"
                style={{ width: "50%", height: "100%", flexShrink: 0 }}
              >
                {/* Onda superior — más suave */}
                <path
                  d="M0,65 C240,110 480,20 720,65 C960,110 1200,20 1440,65 L1440,130 L0,130 Z"
                  fill="rgba(255,255,255,0.07)"
                />
                {/* Onda inferior — más pronunciada */}
                <path
                  d="M0,90 C240,40 480,120 720,75 C960,30 1200,110 1440,70 L1440,130 L0,130 Z"
                  fill="rgba(255,255,255,0.05)"
                />
              </svg>
            ))}
          </div>
        </div>
      </div>

      {/* ── Panel derecho — formulario ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-8">
        {children}
      </div>

    </div>
  )
}
