// Utilidad para exportar datos a CSV descargable en el navegador

export function exportarCSV(filas: Record<string, unknown>[], nombreArchivo: string) {
  if (filas.length === 0) return

  const cabeceras = Object.keys(filas[0])
  const escape = (v: unknown): string => {
    const s = v == null ? "" : String(v).replace(/"/g, '""')
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s
  }

  const csv = [
    cabeceras.join(","),
    ...filas.map(f => cabeceras.map(k => escape(f[k])).join(","))
  ].join("\n")

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${nombreArchivo}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
