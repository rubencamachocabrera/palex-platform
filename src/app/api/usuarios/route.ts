// API de usuarios — solo accesible para ADMIN
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

// GET /api/usuarios — lista todos los usuarios
export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const usuarios = await db.usuario.findMany({
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      creadoEn: true,
    },
    orderBy: { creadoEn: "desc" },
  })

  return NextResponse.json(usuarios)
}

// POST /api/usuarios — crea un nuevo usuario
export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { nombre, email, password, rol } = await req.json()

  if (!nombre || !email || !password || !rol) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })
  }

  const existe = await db.usuario.findUnique({ where: { email } })
  if (existe) {
    return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 })
  }

  const hash = await bcrypt.hash(password, 12)

  const usuario = await db.usuario.create({
    data: { nombre, email, password: hash, rol },
    select: { id: true, nombre: true, email: true, rol: true, activo: true },
  })

  return NextResponse.json(usuario, { status: 201 })
}
