"use client"
import { useEffect } from "react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : null)

interface ConfigFlags {
  crmActivo?: boolean
  incidenciasActivo?: boolean
  analiticaActivo?: boolean
}

/**
 * Flags de modulos activos (ConfigApp). Mientras carga, o si falla, se asume
 * activo (salvo CRM, desactivado por defecto en la UI) para no ocultar nada por error.
 * Se revalida al recibir el evento "palex:config-updated" (admin/configuracion).
 */
export function useConfigApp() {
  const { data, isLoading, mutate } = useSWR<ConfigFlags | null>("/api/config", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })

  useEffect(() => {
    const h = () => { mutate() }
    window.addEventListener("palex:config-updated", h)
    return () => window.removeEventListener("palex:config-updated", h)
  }, [mutate])

  return {
    crmActivo: data?.crmActivo === true,
    incidenciasActivo: data?.incidenciasActivo !== false,
    analiticaActivo: data?.analiticaActivo !== false,
    isLoading,
  }
}
