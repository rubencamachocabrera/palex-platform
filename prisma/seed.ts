// Seed inicial — crea el primer usuario ADMIN en la base de datos
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@palex.com"
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!"

  const hash = await bcrypt.hash(password, 12)

  const admin = await prisma.usuario.upsert({
    where: { email },
    update: { password: hash },
    create: {
      nombre: "Administrador",
      email,
      password: hash,
      rol: "ADMIN",
    },
  })

  console.log(`✅ Admin creado/actualizado: ${admin.email}`)
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
