// API de usuarios — solo accesible para ADMIN
import { checkRateLimit } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

// GET /api/usuarios — lista todos los usuarios
export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "usuarios", { limit: 20, windowMs: 60000 })
    if (rl) return rl

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
      orderBy: [{ creadoEn: "desc" }, { id: "asc" }],
    })

    return NextResponse.json(usuarios)
  } catch (err) {
    console.error("[GET]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST /api/usuarios — crea un nuevo usuario
export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "usuarios_create", { limit: 5, windowMs: 3600000 })
    if (rl) return rl

    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { nombre, email, password, rol } = await req.json()

    if (!nombre || !email || !password || !rol) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })
    }
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
    }
    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 })
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
  } catch (err) {
    console.error("[POST]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
