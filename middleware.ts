// Middleware Edge-compatible — usa authConfig sin Prisma
import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/hospitales",
  "/visitas",
  "/ventas",
  "/perfil",
]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  const isProtected = PROTECTED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + "/"))

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  // Solo rutas de pagina — excluye /api/, archivos estaticos y assets
  // Las rutas /api/ protegen sus propios endpoints verificando la sesion con auth()
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|logo-palex.png|icon-|manifest.json|sw.js).*)",
  ],
}
