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

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      {/* Title bar */}
      <div className="shrink-0 px-5 py-3 bg-white border-b border-gray-100 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-sm font-bold text-gray-900">Mapa de hospitales</h1>
          <p className="text-xs text-gray-400 mt-0.5">{hospitales.length} hospitales activos · España</p>
        </div>
        <span className="text-[10px] text-gray-300 font-medium hidden sm:block">© OpenStreetMap</span>
      </div>

      {/* Map fills remaining height */}
      <div className="flex-1 min-h-0">
        <MapaWrapper hospitales={hospitales} />
      </div>
    </div>
  )
}
