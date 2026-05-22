import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import MapaWrapper from "./MapaWrapper"

export default async function MapaPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const hospitales = await db.hospital.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      ciudad: true,
      provincia: true,
      tipo: true,
      latitud: true,
      longitud: true,
      zona: { select: { id: true, nombre: true } },
      _count: { select: { visitas: true, oportunidades: true } },
    },
    orderBy: { nombre: "asc" },
  })

  const zonas = Array.from(new Set(hospitales.map(h => h.zona.nombre))).sort()

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      {/* Title bar */}
      <div className="shrink-0 px-5 py-3 bg-white border-b border-gray-100 flex items-center gap-4 flex-wrap">
        {/* Left: title + count */}
        <div className="flex items-center gap-3 mr-auto">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: "#f0fdfa" }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#00A99D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 2C7.24 2 5 4.24 5 7c0 4.25 5 11 5 11s5-6.75 5-11c0-2.76-2.24-5-5-5z"/>
              <circle cx="10" cy="7" r="2"/>
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">Mapa de hospitales</h1>
            <p className="text-xs text-gray-400 mt-0.5 leading-none">{hospitales.length} centros activos · España</p>
          </div>
        </div>

        {/* Zone pills */}
        {zonas.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {zonas.map(z => {
              const cnt = hospitales.filter(h => h.zona.nombre === z).length
              return (
                <span
                  key={z}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full"
                  style={{ backgroundColor: "#f0fdfa", color: "#0f766e" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                  {z} <span className="opacity-60">({cnt})</span>
                </span>
              )
            })}
          </div>
        )}

        <span className="text-[10px] text-gray-300 font-medium hidden sm:block">© OpenStreetMap</span>
      </div>

      {/* Map fills remaining height */}
      <div className="flex-1 min-h-0">
        <MapaWrapper hospitales={hospitales} />
      </div>
    </div>
  )
}
