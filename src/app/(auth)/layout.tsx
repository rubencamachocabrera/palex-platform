import { TEAL } from "@/lib/brand"

// Layout para rutas de autenticación — split screen con branding
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ backgroundColor: TEAL }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="text-white font-semibold text-lg">Palex Medical</span>
        </div>

        <div>
          <blockquote className="text-white text-3xl font-light leading-relaxed mb-4" style={{ opacity: 0.95 }}>
            "Improving technologies,<br />improving lives."
          </blockquote>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
            Plataforma interna de gestión de proyectos y ventas preanalíticas
          </p>
        </div>

        <div className="flex gap-8">
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
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-8">
        {children}
      </div>
    </div>
  )
}
