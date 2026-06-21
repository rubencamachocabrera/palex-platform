"use client"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : null)

interface Perfil {
  id: string
  nombre: string
  email: string
  rol: string
  zonaId: string | null
  onboardingCompletado: boolean
  calendarToken?: string
  notificacionesActivas?: boolean
}

export function usePerfil() {
  const { data, error, isLoading, mutate } = useSWR<Perfil | null>("/api/perfil", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })

  return {
    perfil: data ?? null,
    rol: data?.rol ?? null,
    nombre: data?.nombre ?? null,
    isLoading,
    error,
    mutate,
  }
}
