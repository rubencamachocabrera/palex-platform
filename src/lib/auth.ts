// Config completa de NextAuth con Prisma — solo para Server Components y API Routes
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { authConfig } from "@/lib/auth.config"
import { checkRateLimitByKey, getClientIp } from "@/lib/rate-limit"

// Cache de usuario activo — evita query DB en cada request (TTL 5 min)
const ACTIVE_CHECK_MS = 5 * 60 * 1000
const activeCache = new Map<string, { rol: string; checkedAt: number }>()

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role
        if (user.id) activeCache.set(user.id, { rol: (user as { role: string }).role, checkedAt: Date.now() })
        return token
      }

      if (token.sub) {
        const now = Date.now()
        const cached = activeCache.get(token.sub)
        if (!cached || now - cached.checkedAt > ACTIVE_CHECK_MS) {
          try {
            const usuario = await db.usuario.findUnique({
              where: { id: token.sub },
              select: { activo: true, rol: true },
            })
            if (!usuario || !usuario.activo) {
              activeCache.delete(token.sub)
              token.sub = undefined
              token.role = undefined
              return token
            }
            token.role = usuario.rol
            activeCache.set(token.sub, { rol: usuario.rol, checkedAt: now })
          } catch {
            // DB error — don't block, use existing token
          }
        } else {
          token.role = cached.rol
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub
        ;(session.user as { role: string }).role = token.role as string
      }
      return session
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, request) {
        const ip = request instanceof Request ? getClientIp(request) : "unknown"

        if (await checkRateLimitByKey(`login:${ip}`, { limit: 5, windowMs: 60_000 })) {
          return null
        }

        if (!credentials?.email || !credentials?.password) return null

        const email = (credentials.email as string).toLowerCase()

        // Limite por email ademas del limite por IP: rotar de IP no basta para saltarse el freno.
        if (await checkRateLimitByKey(`login-email:${email}`, { limit: 5, windowMs: 60_000 })) {
          return null
        }

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
