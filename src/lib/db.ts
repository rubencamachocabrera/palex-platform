// Cliente Prisma 7 con adapter pg
// Se llama a $connect() explicitamente para pre-calentar el pool TCP
// y evitar la latencia de primera conexion en el primer login/request
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const client = new PrismaClient({ adapter })
  // Iniciar la conexion TCP al pool de forma proactiva
  // Si falla (ej: DB no disponible) no bloquea el arranque
  client.$connect().catch((err) => {
    console.warn("[db] No se pudo pre-conectar a la BD:", err.message)
  })
  return client
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
