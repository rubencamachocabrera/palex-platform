import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

// GET /api/perfil — datos del usuario en sesion
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const usuario = await db.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, nombre: true, email: true, rol: true, creadoEn: true, onboardingCompletado: true },
    })
    return NextResponse.json(usuario)
  } catch (err) {
    console.error("[GET]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// PATCH /api/perfil — actualiza nombre y/o contraseña
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { nombre, passwordActual, passwordNueva } = await req.json()
    const data: Record<string, string> = {}

    if (nombre?.trim()) {
      data.nombre = nombre.trim()
    }

    if (passwordNueva) {
      // Verificar contraseña actual
      const usuario = await db.usuario.findUnique({ where: { id: session.user.id } })
      if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

      const valida = await bcrypt.compare(passwordActual ?? "", usuario.password)
      if (!valida) return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 400 })
      if (passwordNueva.length < 8) return NextResponse.json({ error: "La nueva contraseña debe tener al menos 8 caracteres" }, { status: 400 })

      data.password = await bcrypt.hash(passwordNueva, 12)
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 })
    }

    const actualizado = await db.usuario.update({
      where: { id: session.user.id },
      data,
      select: { id: true, nombre: true, email: true, rol: true },
    })

    return NextResponse.json(actualizado)
  } catch (err) {
    console.error("[PATCH]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
