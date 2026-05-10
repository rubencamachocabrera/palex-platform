import { redirect } from "next/navigation"

// La raiz redirige siempre al dashboard
// El middleware se encarga de mandar al login si no hay sesion
export default function RootPage() {
  redirect("/dashboard")
}
