// Config Edge-compatible de NextAuth — sin imports de Prisma ni Node.js
// Usada por el middleware (Edge Runtime)
import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    // Añade el rol al token JWT
    async jwt({ token, user }) {
      if (user) token.role = (user as { role: string }).role
      return token
    },
    // Expone el rol en la sesión
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!
        ;(session.user as { role: string }).role = token.role as string
      }
      return session
    },
  },
}
