"use client"

import { useState, useEffect, useCallback, useRef } from "react"

type TipoFavorito = "HOSPITAL" | "PROYECTO"

export function useFavoritos(tipo: TipoFavorito) {
  const [ids, setIds] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const inflightRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetch(`/api/favoritos?tipo=${tipo}`)
      .then(r => { if (r.ok) return r.json(); throw new Error() })
      .then((data: { entidadId: string }[]) => {
        if (Array.isArray(data)) {
          setIds(new Set(data.map(f => f.entidadId)))
        }
      })
      .catch(() => { /* silencioso */ })
      .finally(() => setLoaded(true))
  }, [tipo])

  const toggle = useCallback((id: string) => {
    // Prevenir doble-click mientras la request esta en vuelo
    if (inflightRef.current.has(id)) return
    inflightRef.current.add(id)

    // Optimistic update
    setIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

    fetch("/api/favoritos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entidadId: id, tipo }),
    })
      .then(r => { if (!r.ok) throw new Error() })
      .catch(() => {
        // Revertir en caso de error
        setIds(prev => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
      })
      .finally(() => { inflightRef.current.delete(id) })
  }, [tipo])

  return { ids, toggle, loaded }
}
