// Config completa de NextAuth con Prisma — solo para Server Components y API Routes
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { authConfig } from "@/lib/auth.config"
import { checkRateLimitByKey } from "@/lib/rate-limit"

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, request) {
        const ip =
          (request instanceof Request
            ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
              request.headers.get("x-real-ip")
            : null) ?? "unknown"

        if (checkRateLimitByKey(`login:${ip}`, { limit: 5, windowMs: 60_000 })) {
          return null
        }

        if (!credentials?.email || !credentials?.password) return null

        const usuario = await db.usuario.findUnique({
          where: { email: credentials.email as string },
        })

        if (!usuario || !usuario.activo) return null

        const passwordValida = await bcrypt.compare(
          credentials.password as string,
          usuario.password
        )

        if (!passwordValida) return null

        return {
          id: usuario.id,
          name: usuario.nombre,
          email: usuario.email,
          role: usuario.rol,
        }
      },
    }),
  ],
})
