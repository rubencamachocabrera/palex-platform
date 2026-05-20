"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { TEAL } from "@/lib/brand"

export default function ToggleCRM({ crmActivo }: { crmActivo: boolean }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function toggle() {
    setLoading(true)
    try {
      await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crmActivo: !crmActivo }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 shrink-0"
      title={crmActivo ? "Ocultar módulo CRM del dashboard" : "Mostrar módulo CRM en el dashboard"}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
      <span className="hidden sm:inline text-gray-600">{crmActivo ? "CRM activo" : "CRM oculto"}</span>
      <span
        className="w-8 h-4.5 rounded-full relative flex items-center shrink-0"
        style={{ backgroundColor: crmActivo ? TEAL : "#d1d5db", padding: "2px", width: "32px", height: "18px", display: "inline-flex" }}
      >
        <span
          className="w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{ width: "14px", height: "14px", transform: crmActivo ? "translateX(14px)" : "translateX(0px)" }}
        />
      </span>
    </button>
  )
}
