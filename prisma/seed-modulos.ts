// Seed de módulos INLAB — ejecutar con: npm run db:seed-modulos
// Usa upsert: seguro de re-ejecutar sin borrar datos
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

const MODULOS = [
  "Sistema de Gestión de Peticiones Analíticas",
  "Automatización en el Etiquetado",
  "Trazabilidad de Muestras",
  "Sistema de Gestión de Turnos",
]

async function main() {
  for (const nombre of MODULOS) {
    await db.moduloInlab.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    })
  }
  console.log(`Módulos INLAB creados/verificados: ${MODULOS.length}`)
  MODULOS.forEach(m => console.log(`  - ${m}`))
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
