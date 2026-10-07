import type { Metadata } from "next"
import { ToastProvider } from "@/components/Toast"

// El informe público no debe indexarse ni filtrar el token por Referer a terceros
export const metadata: Metadata = {
  title: "Informe Inteligencia InLab · Palex Medical",
  description: "Informe de solo lectura de Inteligencia InLab compartido por Palex Medical.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

export default function ShareInlabLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}
