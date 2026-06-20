// Middleware Edge-compatible — usa authConfig sin Prisma
import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

// Prefijos de rutas protegidas (después de quitar el route group (dashboard))
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/hospitales",
  "/visitas",
  "/ventas",
  "/proyectos",
  "/hardware",
  "/mapa",
  "/perfil",
  "/datos",
  "/transporte",
  "/recordatorios",
]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  const isProtected = PROTECTED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + "/"))

  // Si no está autenticado y accede a una ruta protegida → login
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Si ya está autenticado y va a /login → dashboard
  if (pathname === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api/auth|api/share|_next/static|_next/image|favicon.ico|logo-palex.png|share/).*)"],
}
