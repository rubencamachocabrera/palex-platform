import * as XLSX from "xlsx"

// Exporta múltiples hojas a un archivo Excel
export function exportarExcel(
  hojas: { nombre: string; datos: Record<string, unknown>[] }[],
  nombreArchivo: string
) {
  const wb = XLSX.utils.book_new()
  for (const hoja of hojas) {
    const ws = XLSX.utils.json_to_sheet(hoja.datos)
    // Auto column widths
    const cols = Object.keys(hoja.datos[0] ?? {})
    ws["!cols"] = cols.map(k => {
      const maxLen = Math.max(
        k.length,
        ...hoja.datos.map(r => String(r[k] ?? "").length)
      )
      return { wch: Math.min(maxLen + 2, 40) }
    })
    XLSX.utils.book_append_sheet(wb, ws, hoja.nombre.slice(0, 31))
  }
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`)
}

// Hoja simple
export function exportarExcelSimple(
  datos: Record<string, unknown>[],
  nombreArchivo: string,
  nombreHoja = "Datos"
) {
  exportarExcel([{ nombre: nombreHoja, datos }], nombreArchivo)
}
