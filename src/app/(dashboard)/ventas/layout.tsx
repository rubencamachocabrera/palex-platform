import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export default async function VentasLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as { role?: string }).role
  if (role !== "ADMIN" && role !== "VENTAS") redirect("/dashboard")

  let config = await db.configApp.findUnique({ where: { id: 1 } })
  if (!config) config = await db.configApp.create({ data: { id: 1, crmActivo: true } })
  if (!config.crmActivo) redirect("/dashboard")

  return <>{children}</>
}
