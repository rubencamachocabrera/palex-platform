// Layout del dashboard — protegido, con sidebar
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/Sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar nombre={session.user.name ?? "Usuario"} rol={session.user.role} />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
