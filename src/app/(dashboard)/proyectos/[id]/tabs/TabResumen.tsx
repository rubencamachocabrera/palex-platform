"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { TEAL, ORANGE } from "@/lib/brand"
import { useToast } from "@/components/Toast"
import type { Proyecto, HardwareUnidad } from "../types"
import { fmtFecha, ESTADO_LABEL, ESTADO_COLOR, PRIORIDAD, FASE_ESTADO_COLOR, HW_ESTADO, HW_TIPO_LABEL } from "../types"

const TIPO_H_LABEL: Record<string, string> = {
  HOSPITAL_PUBLICO: "Hospital Público", HOSPITAL_PRIVADO: "Hospital Privado",
  CLINICA_PRIVADA: "Clínica Privada", LABORATORIO: "Laboratorio",
  CENTRO_SALUD: "Centro de Salud", UNIVERSIDAD: "Universidad", OTRO: "Otro",
}

function RowInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-20 shrink-0 text-sm">{label}</span>
      <span className="text-gray-700 font-medium text-sm">{value}</span>
    </div>
  )
}

export function TabResumen({ pp, onUpdate }: { pp: Proyecto; onUpdate: (p: Proyecto) => void }) {
  const { success, error: toastError } = useToast()
  const [shareModal, setShareModal] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [savingMapa, setSavingMapa] = useState(false)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [mapaExpanded, setMapaExpanded] = useState(() => Boolean(pp.mapaHtml))
  const mapRef = useRef<HTMLIFrameElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mapH, setMapH] = useState(560)

  useEffect(() => {
    setOrigin(window.location.origin)
    const style = document.createElement("style")
    style.id = "resumen-print-css"
    style.innerHTML = `
      @media print {
        body * { visibility: hidden !important; }
        #resumen-print-zone, #resumen-print-zone * { visibility: visible !important; }
        #resumen-print-zone { position: absolute; left: 0; top: 0; width: 100%; padding: 32px; box-sizing: border-box; }
        @page { size: A4; margin: 12mm; }
      }
    `
    document.head.appendChild(style)
    return () => { document.getElementById("resumen-print-css")?.remove() }
  }, [])

  const shareUrl = pp.shareToken && origin ? `${origin}/share/proyecto/${pp.shareToken}` : null

  useEffect(() => {
    if (shareUrl) {
      import("qrcode").then(m =>
        m.default.toDataURL(shareUrl, { width: 220, margin: 2, color: { dark: "#111827", light: "#ffffff" } })
      ).then(setQrDataUrl).catch(() => setQrDataUrl(null))
    } else {
      setQrDataUrl(null)
    }
  }, [shareUrl])

  async function generateShare() {
    setGenerando(true)
    try {
      const r = await fetch(`/api/proyectos/${pp.id}/share`, { method: "POST" })
      if (!r.ok) throw new Error()
      const { token } = await r.json()
      onUpdate({ ...pp, shareToken: token })
      success("Enlace generado")
    } catch { toastError("Error al generar enlace") }
    finally { setGenerando(false) }
  }

  async function revokeShare() {
    setRevoking(true)
    try {
      await fetch(`/api/proyectos/${pp.id}/share`, { method: "DELETE" })
      onUpdate({ ...pp, shareToken: null })
      success("Enlace revocado"); setCopied(false)
    } catch { toastError("Error") }
    finally { setRevoking(false) }
  }

  async function copyLink() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      // Fallback para HTTP o contextos sin permisos de clipboard
      const ta = document.createElement("textarea")
      ta.value = shareUrl; ta.style.position = "fixed"; ta.style.opacity = "0"
      document.body.appendChild(ta); ta.select()
      document.execCommand("copy"); document.body.removeChild(ta)
    }
    setCopied(true); setTimeout(() => setCopied(false), 2500)
  }

  async function saveMapaContent(html: string) {
    setSavingMapa(true)
    try {
      const r = await fetch(`/api/proyectos/${pp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapaHtml: html || null }),
      })
      if (!r.ok) throw new Error()
      onUpdate({ ...pp, mapaHtml: html || null })
      success(html ? "Mapa importado" : "Mapa eliminado")
    } catch { toastError("Error al guardar mapa") }
    finally { setSavingMapa(false) }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    readFile(file)
    e.target.value = ""
  }

  function readFile(file: File) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      if (content) saveMapaContent(content)
    }
    reader.readAsText(file, "utf-8")
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = Array.from(e.dataTransfer.files).find(f => f.name.endsWith(".html") || f.name.endsWith(".htm"))
    if (file) readFile(file)
    else toastError("Solo se aceptan ficheros .html o .htm")
  }

  function printMapa() {
    if (!pp.mapaHtml) { toastError("No hay mapa importado"); return }
    const win = window.open("", "_blank", "width=1280,height=960")
    if (!win) { toastError("Permite ventanas emergentes para imprimir"); return }
    const fecha = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
    const esc = (s: string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    // Inyectamos toolbar y CSS directamente en el HTML de Leaflet — sin iframe.
    // Sin iframe no hay rasterizacion: el mapa se renderiza como HTML nativo en el PDF.
    const toolbar = `<div id="__ptb" style="position:fixed;top:0;left:0;right:0;height:52px;background:#fff;border-bottom:2px solid #00A99D;display:flex;align-items:center;gap:12px;padding:0 20px;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.1)"><span style="font-weight:800;color:#00A99D;font-size:14px;white-space:nowrap">Palex·<span style="color:#F7941D">InLab</span></span><span style="flex:1;font-size:12px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(pp.titulo)} &middot; ${esc(pp.hospital.nombre)} &middot; ${fecha}</span><span id="__pst" style="font-size:11px;color:#9ca3af;white-space:nowrap">Cargando tiles&hellip;</span><button id="__pbp" disabled onclick="window.print()" style="padding:7px 18px;background:#00A99D;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:not-allowed;opacity:.5;white-space:nowrap">Imprimir &mdash; PDF</button><button onclick="window.close()" style="padding:7px 14px;background:#f3f4f6;color:#374151;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Cerrar</button></div>`
    const printHead = [
      "<style>",
      "@media print{",
      "#__ptb{display:none!important}",
      "@page{margin:0;size:A3 landscape}",
      "html,body{margin:0!important;padding:0!important;overflow:visible!important}",
      "*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}",
      "}",
      "</style>",
      "<scr" + "ipt>",
      "window.addEventListener('load',function(){",
      "setTimeout(function(){",
      "var b=document.getElementById('__pbp'),s=document.getElementById('__pst');",
      "if(b){b.disabled=false;b.style.opacity='1';b.style.cursor='pointer';}",
      "if(s){s.textContent='Listo — puedes imprimir';}",
      "},2500);",
      "});",
      "</scr" + "ipt>",
    ].join("")
    let html = pp.mapaHtml
    if (html.includes("</head>")) {
      html = html.replace("</head>", printHead + "\n</head>")
    } else {
      html = "<head>" + printHead + "</head>" + html
    }
    if (/<body[^>]*>/i.test(html)) {
      html = html.replace(/<body([^>]*)>/i, (m: string) => m + toolbar)
    } else {
      html = toolbar + html
    }
    win.document.write(html)
    win.document.close()
    win.focus()
  }

  function printInformeCompleto() {
    const win = window.open("", "_blank", "width=1050,height=900")
    if (!win) { toastError("Permite ventanas emergentes para imprimir"); return }
    const e = (s: string | null | undefined) =>
      String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    const fecha = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
    const estadoColor = ESTADO_COLOR[pp.estado]?.text ?? "#6b7280"
    const estadoBg = ESTADO_COLOR[pp.estado]?.bg ?? "#f3f4f6"
    const estadoLabel = ESTADO_LABEL[pp.estado] ?? pp.estado
    const prioLabel = PRIORIDAD[pp.prioridad]?.label ?? ""
    const prioColor = PRIORIDAD[pp.prioridad]?.color ?? ""
    const tipoH = pp.hospital.tipo ? (TIPO_H_LABEL[pp.hospital.tipo] ?? pp.hospital.tipo) : ""
    const fasesRows = pp.fases.map(f => {
      const cols: Record<string,string> = { COMPLETADO:"#16a34a", EN_PROGRESO:"#00A99D", BLOQUEADO:"#dc2626", PENDIENTE:"#9ca3af" }
      const lbls: Record<string,string> = { COMPLETADO:"Completado", EN_PROGRESO:"En progreso", BLOQUEADO:"Bloqueado", PENDIENTE:"Pendiente" }
      return `<tr><td class="cell">${e(f.nombre)}</td><td class="cell" style="color:${cols[f.estado]??'#9ca3af'};font-weight:600">${lbls[f.estado]??f.estado}</td><td class="cell tr">${fmtFecha(f.fechaReal ?? f.fechaPlan)}</td></tr>`
    }).join("")
    const hitosHTML = pp.hitos.map(h =>
      `<span class="hito ${h.completado?"hito-ok":"hito-pend"}">${h.completado?"✓":"◇"} ${e(h.titulo)} · ${fmtFecha(h.fecha)}</span>`
    ).join("")
    const hwSections = Object.entries(byTipo).map(([tipo, units]) => {
      const sub = units.reduce((s,u) => s + (u.catalogo.precio ?? 0), 0)
      const rows = units.map(u =>
        `<tr><td class="cell">${e(u.catalogo.marca)} ${e(u.catalogo.modelo)}</td><td class="cell mono">${e(u.numSerie??"—")}</td><td class="cell" style="color:${HW_ESTADO[u.estado]?.color??"#6b7280"}">${HW_ESTADO[u.estado]?.label??u.estado}</td><td class="cell tr">${u.catalogo.precio!=null?u.catalogo.precio.toLocaleString("es-ES",{style:"currency",currency:"EUR"}):"—"}</td></tr>`
      ).join("")
      return `<div class="hw-group"><p class="hw-tipo">${e(HW_TIPO_LABEL[tipo]??tipo)} (${units.length})</p><table class="tbl"><thead><tr><th>Modelo</th><th>N/S</th><th>Estado</th><th class="tr">Precio/ud</th></tr></thead><tbody>${rows}</tbody>${sub>0?`<tfoot><tr><td colspan="3" class="sub-lbl">Subtotal</td><td class="sub-val tr">${sub.toLocaleString("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0})}</td></tr></tfoot>`:""}</table></div>`
    }).join("")
    const visitasRows = pp.visitas.slice(0,8).map(v => {
      const col = v.estado==="COMPLETADA"?"#16a34a":v.estado==="BORRADOR"?"#d97706":"#6b7280"
      return `<tr><td class="cell">${fmtFecha(v.fecha)}</td><td class="cell" style="color:${col};font-weight:600">${e(v.estado)}</td><td class="cell">${e(v.tipo)}</td><td class="cell">${e(v.usuario.nombre)}</td></tr>`
    }).join("")
    const contactosHTML = pp.contactos.map(({contacto:c}) =>
      `<div class="contact"><p class="cn">${e(c.nombre)}${c.principal?` <span class="badge-p">Principal</span>`:""}</p>${c.cargo?`<p class="cm">${e(c.cargo)}</p>`:""}${c.email?`<p class="cm">${e(c.email)}</p>`:""}${c.telefono?`<p class="cm">${e(c.telefono)}</p>`:""}</div>`
    ).join("")
    const pb = `<div class="pw"><div class="pb" style="width:${pct}%;background:${pct===100?"#16a34a":"#00A99D"}"></div></div>`
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${e(pp.titulo)} — Informe de Proyecto</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;background:#fff;font-size:13px}
.toolbar{display:flex;align-items:center;justify-content:space-between;padding:12px 28px;background:#f8fafc;border-bottom:2px solid #e5e7eb;position:sticky;top:0;z-index:10}
.tb{font-weight:800;color:#00A99D;font-size:15px}.tb em{color:#F7941D;font-style:normal}
.bp{padding:8px 20px;background:#00A99D;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer}
.bc{padding:8px 16px;background:#f3f4f6;color:#374151;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;margin-left:8px}
.cover{min-height:100vh;display:flex;flex-direction:column;border-top:8px solid #00A99D;page-break-after:always;break-after:page}
.ctop{padding:32px 44px 0;display:flex;justify-content:space-between;align-items:center}
.cbrand{font-size:18px;font-weight:800;color:#00A99D;letter-spacing:-0.5px}.cbrand em{color:#F7941D;font-style:normal}
.cbody{flex:1;display:flex;flex-direction:column;justify-content:center;padding:40px 44px 28px}
.eye{font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af;margin-bottom:14px}
.ctitle{font-size:38px;font-weight:800;color:#111827;line-height:1.1;letter-spacing:-0.5px;margin-bottom:8px}
.chosp{font-size:18px;font-weight:600;color:#374151;margin-bottom:4px}
.cloc{font-size:13px;color:#9ca3af;margin-bottom:24px}
.cbadges{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px}
.badge{display:inline-block;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700}
.cmeta{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:20px;background:#f8fafc;border-radius:14px;border:1px solid #e5e7eb;margin-bottom:20px}
.mi p:first-child{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:3px}
.mi p:last-child{font-size:15px;font-weight:800;color:#111827}
.pl{display:flex;justify-content:space-between;font-size:11px;color:#6b7280;margin-bottom:5px}
.pw{width:100%;height:8px;background:#e5e7eb;border-radius:99px;overflow:hidden}
.pb{height:100%;border-radius:99px}
.cfooter{padding:18px 44px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center}
.cfb{font-size:12px;font-weight:700;color:#9ca3af}.cfc{font-size:11px;color:#d1d5db;font-style:italic}
.content{padding:28px 44px;max-width:920px;margin:0 auto}
.phdr{display:none}
.sec{margin-bottom:28px}
.stitle{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9ca3af;margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid #f3f4f6}
.kgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.kcard{background:#f8fafc;border-radius:12px;padding:14px;border-top:3px solid}
.kl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:5px}
.kv{font-size:22px;font-weight:800;line-height:1}
.ks{font-size:10px;color:#9ca3af;margin-top:3px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.card{background:#f8fafc;border-radius:12px;padding:14px}
.ri{display:flex;gap:8px;margin-bottom:5px}
.rl{font-size:11px;color:#9ca3af;width:60px;flex-shrink:0}
.rv{font-size:12px;font-weight:600;color:#374151}
.contact{margin-bottom:10px}
.cn{font-size:13px;font-weight:700;color:#111827}
.cm{font-size:11px;color:#6b7280;margin-top:1px}
.badge-p{display:inline-block;font-size:9px;background:#00A99D18;color:#00A99D;padding:1px 6px;border-radius:10px;font-weight:700;margin-left:5px}
.tbl{width:100%;border-collapse:collapse;font-size:12px}
.tbl thead th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;padding:0 0 7px;text-align:left;border-bottom:1px solid #e5e7eb}
.cell{padding:7px 8px 7px 0;border-bottom:1px solid #f9fafb;vertical-align:top}
.tr{text-align:right;padding-right:0}
.mono{font-family:monospace;font-size:11px;color:#6b7280}
.sub-lbl{padding-top:7px;font-size:11px;font-weight:600;color:#6b7280}
.sub-val{padding-top:7px;font-weight:700;color:#111827;text-align:right}
.hw-group{margin-bottom:18px}
.hw-tipo{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;margin-bottom:7px}
.hw-total{margin-top:10px;padding-top:10px;border-top:2px solid #e5e7eb;display:flex;justify-content:space-between;font-size:14px;font-weight:800}
.hitos-wrap{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}
.hito{display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:4px 11px;border-radius:20px;border:1px solid}
.hito-ok{background:#f0fdf4;border-color:#bbf7d0;color:#16a34a}
.hito-pend{background:#fffbeb;border-color:#fde68a;color:#d97706}
.nt{font-size:13px;color:#374151;line-height:1.7;white-space:pre-wrap}
.pfooter{display:none}
.map-page{display:none;padding:28px 44px;flex-direction:column;min-height:100vh}
@media print{
  .toolbar,.no-print{display:none!important}
  .cover{min-height:100vh;page-break-after:always;break-after:page}
  .phdr{display:flex!important;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:2px solid #00A99D;margin-bottom:20px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .phb{font-weight:800;color:#00A99D;font-size:12px}.phb em{color:#F7941D;font-style:normal}
  .phm{font-size:10px;color:#9ca3af;text-align:right}
  .kgrid,.cmeta{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .pfooter{display:flex!important;justify-content:space-between;padding-top:10px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;margin-top:28px}
  .map-page{display:flex!important;break-before:page;page-break-before:always}
  .map-page #mpf{height:calc(100vh - 100px)!important;min-height:0!important}
  @page{margin:14mm 14mm 18mm;size:A4}
  @page:first{margin:0;size:A4}
}
</style></head><body>
<div class="toolbar no-print">
  <span class="tb">Palex Medical · <em>InLab</em></span>
  <div><button class="bp" onclick="window.print()">Imprimir / Guardar PDF</button><button class="bc" onclick="window.close()">Cerrar</button></div>
</div>
<div class="cover">
  <div class="ctop">
    <span class="cbrand">Palex Medical · <em>InLab</em></span>
    <span style="font-size:11px;color:#9ca3af">Informe confidencial · ${e(fecha)}</span>
  </div>
  <div class="cbody">
    <p class="eye">Informe de Proyecto</p>
    <h1 class="ctitle">${e(pp.titulo)}</h1>
    <p class="chosp">${e(pp.hospital.nombre)}</p>
    <p class="cloc">${e(pp.hospital.ciudad)}${pp.hospital.provincia?", "+e(pp.hospital.provincia):""}${tipoH?" · "+e(tipoH):""}${pp.hospital.camas?" · "+pp.hospital.camas+" camas":""}</p>
    <div class="cbadges">
      <span class="badge" style="background:${estadoBg};color:${estadoColor}">${estadoLabel}</span>
      ${pp.prioridad>0?`<span class="badge" style="background:#fff7ed;color:${e(prioColor)}">${e(prioLabel)}</span>`:""}
      ${pp.hospital.zona?`<span class="badge" style="background:#f0f9ff;color:#0369a1">Zona ${e(pp.hospital.zona.nombre)}</span>`:""}
    </div>
    <div class="cmeta">
      <div class="mi"><p>Presupuesto</p><p>${pp.presupuesto!=null?pp.presupuesto.toLocaleString("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}):"—"}</p></div>
      <div class="mi"><p>Inicio planificado</p><p>${fmtFecha(pp.fechaInicio)}</p></div>
      <div class="mi"><p>Fin planificado</p><p>${fmtFecha(pp.fechaFinPlan)}</p></div>
      ${pp.responsable?`<div class="mi"><p>Responsable</p><p>${e(pp.responsable.nombre)}</p></div>`:""}
      <div class="mi"><p>Hardware</p><p>${pp.hardwareUnidades.length} uds${totalHW>0?" · "+totalHW.toLocaleString("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}):""}</p></div>
      <div class="mi"><p>Visitas</p><p>${pp.visitas.length} (${visitasOK} completadas)</p></div>
    </div>
    <div class="pl"><span>${fasesOK} de ${pp.fases.length} fases completadas</span><span style="font-weight:700;color:${pct===100?"#16a34a":"#00A99D"}">${pct}%</span></div>
    ${pb}
  </div>
  <div class="cfooter"><span class="cfb">Palex Medical · InLab</span><span class="cfc">Documento confidencial — uso interno</span></div>
</div>
<div class="content">
  <div class="phdr"><span class="phb">Palex Medical · <em>InLab</em></span><div class="phm"><strong>${e(pp.titulo)}</strong><br>${e(fecha)}</div></div>
  <div class="sec"><p class="stitle">Indicadores del proyecto</p>
    <div class="kgrid">
      <div class="kcard" style="border-top-color:${pct===100?"#16a34a":"#00A99D"}"><p class="kl">Progreso</p><p class="kv" style="color:${pct===100?"#16a34a":"#00A99D"}">${pct}%</p><p class="ks">${fasesOK}/${pp.fases.length} fases</p></div>
      <div class="kcard" style="border-top-color:#7c3aed"><p class="kl">Hardware</p><p class="kv" style="color:#7c3aed">${pp.hardwareUnidades.length} uds</p><p class="ks">${totalHW>0?totalHW.toLocaleString("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}):"Sin precios"}</p></div>
      <div class="kcard" style="border-top-color:#0369a1"><p class="kl">Visitas</p><p class="kv" style="color:#0369a1">${pp.visitas.length}</p><p class="ks">${visitasOK} completadas</p></div>
      <div class="kcard" style="border-top-color:#F7941D"><p class="kl">Duración</p><p class="kv" style="color:#F7941D">${duracionDias?duracionDias+" d":"—"}</p><p class="ks">${duracionDias?"días planificados":"Sin fechas"}</p></div>
    </div>
  </div>
  <div class="sec two">
    <div class="card"><p class="stitle">Datos del hospital</p>
      ${tipoH?`<div class="ri"><span class="rl">Tipo</span><span class="rv">${e(tipoH)}</span></div>`:""}
      <div class="ri"><span class="rl">Ciudad</span><span class="rv">${e(pp.hospital.ciudad)}${pp.hospital.provincia?", "+e(pp.hospital.provincia):""}</span></div>
      ${pp.hospital.camas?`<div class="ri"><span class="rl">Camas</span><span class="rv">${pp.hospital.camas}</span></div>`:""}
      ${pp.hospital.direccion?`<div class="ri"><span class="rl">Dirección</span><span class="rv">${e(pp.hospital.direccion)}</span></div>`:""}
      ${pp.hospital.zona?`<div class="ri"><span class="rl">Zona</span><span class="rv">${e(pp.hospital.zona.nombre)}</span></div>`:""}
      ${pp.hospital.pais?`<div class="ri"><span class="rl">País</span><span class="rv">${e(pp.hospital.pais)}</span></div>`:""}
    </div>
    <div class="card"><p class="stitle">Contactos del proyecto</p>
      ${pp.contactos.length>0?contactosHTML:`<p style="font-size:12px;color:#9ca3af">Sin contactos vinculados</p>`}
    </div>
  </div>
  ${pp.fases.length>0?`<div class="sec"><p class="stitle">Fases del proyecto</p><table class="tbl"><thead><tr><th>Fase</th><th>Estado</th><th class="tr">Fecha</th></tr></thead><tbody>${fasesRows}</tbody></table>${hitosHTML?`<div class="hitos-wrap">${hitosHTML}</div>`:""}</div>`:""}
  ${pp.hardwareUnidades.length>0?`<div class="sec"><p class="stitle">Inventario de hardware</p>${hwSections}${totalHW>0?`<div class="hw-total"><span>Total hardware</span><span style="color:#00A99D">${totalHW.toLocaleString("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0})}</span></div>`:""}</div>`:""}
  ${pp.visitas.length>0?`<div class="sec"><p class="stitle">Visitas (${pp.visitas.length})</p><table class="tbl"><thead><tr><th>Fecha</th><th>Estado</th><th>Tipo</th><th>Técnico</th></tr></thead><tbody>${visitasRows}</tbody></table>${pp.visitas.length>8?`<p style="font-size:11px;color:#9ca3af;margin-top:7px">+${pp.visitas.length-8} visitas adicionales</p>`:""}</div>`:""}
  ${pp.descripcion||pp.notas?`<div class="sec"><p class="stitle">Notas y descripción</p>${pp.descripcion?`<div style="margin-bottom:14px"><p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:5px">Descripción</p><p class="nt">${e(pp.descripcion)}</p></div>`:""}${pp.notas?`<div><p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:5px">Notas internas</p><p class="nt">${e(pp.notas)}</p></div>`:""}</div>`:""}
  <div class="pfooter"><span>Palex Medical · InLab — Confidencial</span><span>Generado: ${e(fecha)}</span></div>
</div>
${pp.mapaHtml ? `<div class="map-page">
  <div class="phdr"><span class="phb">Palex Medical · <em>InLab</em></span><div class="phm"><strong>${e(pp.titulo)}</strong><br>Mapa de instalación · ${e(fecha)}</div></div>
  <p class="stitle" style="margin-bottom:12px">Mapa de instalación — ${e(pp.hospital.nombre)}</p>
  <iframe id="mpf" style="width:100%;flex:1;border:none;display:block;min-height:500px"></iframe>
  <div class="pfooter" style="margin-top:10px"><span>Palex Medical · InLab — Confidencial</span><span>Generado: ${e(fecha)}</span></div>
</div>
<script>(function(){var el=document.getElementById('mpf');el.addEventListener('load',function(){setTimeout(function(){try{window.print();}catch(e){}},2000);});el.srcdoc=${JSON.stringify(pp.mapaHtml).replace(/</g,"\\u003c").replace(/>/g,"\\u003e")};})();<\/script>` : `<script>setTimeout(function(){try{window.print();}catch(e){}},500);<\/script>`}
</body></html>`)
    win.document.close()
    win.focus()
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(pp, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `proyecto-${pp.id}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  function exportHWCSV() {
    const rows = [
      ["Tipo", "Marca", "Modelo", "N_Serie", "Estado", "Precio_EUR"],
      ...pp.hardwareUnidades.map(u => [
        HW_TIPO_LABEL[u.catalogo.tipo] ?? u.catalogo.tipo,
        u.catalogo.marca, u.catalogo.modelo,
        u.numSerie ?? "",
        HW_ESTADO[u.estado]?.label ?? u.estado,
        u.catalogo.precio != null ? String(u.catalogo.precio) : "",
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `hardware-${pp.id}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function handleMapLoad(e: React.SyntheticEvent<HTMLIFrameElement>) {
    try {
      const doc = e.currentTarget.contentDocument
      if (doc) setMapH(Math.max(400, Math.min(doc.documentElement.scrollHeight + 32, 8000)))
    } catch { setMapH(3000) }
  }

  const fasesOK = pp.fases.filter(f => f.estado === "COMPLETADO").length
  const pct = pp.fases.length ? Math.round((fasesOK / pp.fases.length) * 100) : 0
  const totalHW = pp.hardwareUnidades.reduce((s, u) => s + (u.catalogo.precio ?? 0), 0)
  const visitasOK = pp.visitas.filter(v => v.estado === "COMPLETADA").length
  const estadoStyle = ESTADO_COLOR[pp.estado] ?? { bg: "#f3f4f6", text: "#6b7280" }
  const genDate = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
  const byTipo = pp.hardwareUnidades.reduce<Record<string, HardwareUnidad[]>>((acc, u) => {
    const t = u.catalogo.tipo; if (!acc[t]) acc[t] = []; acc[t].push(u); return acc
  }, {})
  const duracionDias = pp.fechaInicio && pp.fechaFinPlan
    ? Math.round((new Date(pp.fechaFinPlan).getTime() - new Date(pp.fechaInicio).getTime()) / 86400000)
    : null

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6 print:hidden">
        <div>
          <h3 className="font-bold text-gray-900 text-base">Resumen del proyecto</h3>
          <p className="text-xs text-gray-400 mt-0.5">Vista 360° · {pp.hospital.nombre}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Primarios */}
          <button onClick={printInformeCompleto}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-85 shadow-sm"
            style={{ backgroundColor: TEAL }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            Informe completo
          </button>
          <button onClick={printMapa}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition-colors hover:opacity-85 shadow-sm"
            style={{ borderColor: TEAL, color: TEAL }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
            Mapa
          </button>
          <button onClick={() => setShareModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition-colors hover:bg-teal-50 shadow-sm"
            style={{ borderColor: TEAL, color: TEAL }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Compartir
          </button>
          {/* Separador */}
          <div className="w-px h-6 bg-gray-200 hidden sm:block" />
          {/* Secundarios */}
          <button onClick={exportJSON}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            JSON
          </button>
          {pp.hardwareUnidades.length > 0 && (
            <button onClick={exportHWCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              CSV
            </button>
          )}
          <button onClick={() => window.open(`/api/proyectos/${pp.id}/excel`)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <path d="M8 13h3l1 3 2-6 1 3h3"/>
            </svg>
            Excel
          </button>
          <div className="w-px h-6 bg-gray-200 hidden sm:block" />
          <button onClick={() => fileInputRef.current?.click()} disabled={savingMapa}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {savingMapa ? "Guardando…" : pp.mapaHtml ? "Reemplazar mapa" : "Importar mapa"}
          </button>
          {pp.mapaHtml && (
            <button onClick={() => saveMapaContent("")} disabled={savingMapa}
              title="Eliminar mapa"
              className="flex items-center justify-center w-9 h-9 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Printable zone */}
      <div id="resumen-print-zone" className="space-y-5">

        {/* Print header (solo impresion) */}
        <div className="hidden print:flex items-start justify-between border-b border-gray-200 pb-5">
          <div>
            <p className="text-xl font-bold" style={{ color: TEAL }}>Palex Medical · InLab</p>
            <p className="text-sm text-gray-500 mt-0.5">Informe de Proyecto — Confidencial</p>
          </div>
          <p className="text-xs text-gray-400">Generado: {genDate}</p>
        </div>

        {/* -- Hero card -- visible en pantalla ------------- */}
        {(() => {
          const isRetrasado = pp.fechaFinPlan && new Date(pp.fechaFinPlan) < new Date()
            && pp.estado !== "COMPLETADO" && pp.estado !== "CANCELADO"
          return (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden print:hidden">
              {/* Gradient accent bar */}
              <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${TEAL} 0%, ${ORANGE} 100%)` }} />
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                  {/* Left: identity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2.5">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: estadoStyle.bg, color: estadoStyle.text }}>
                        {ESTADO_LABEL[pp.estado]}
                      </span>
                      {pp.prioridad > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50" style={{ color: PRIORIDAD[pp.prioridad]?.color }}>
                          {PRIORIDAD[pp.prioridad]?.label}
                        </span>
                      )}
                      {isRetrasado && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600">Retrasado</span>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{pp.titulo}</h2>

                    {/* Hospital row */}
                    <div className="flex items-center gap-2 flex-wrap text-sm mb-3">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                      <span className="font-semibold text-gray-800">{pp.hospital.nombre}</span>
                      {pp.hospital.tipo && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                          {TIPO_H_LABEL[pp.hospital.tipo] ?? pp.hospital.tipo}
                        </span>
                      )}
                      <span className="text-gray-400 text-xs">
                        {pp.hospital.ciudad}{pp.hospital.provincia ? `, ${pp.hospital.provincia}` : ""}
                        {pp.hospital.pais && pp.hospital.pais !== "España" ? ` · ${pp.hospital.pais}` : ""}
                      </span>
                      {pp.hospital.camas && (
                        <span className="text-gray-400 text-xs">{pp.hospital.camas} camas</span>
                      )}
                    </div>

                    {/* Meta chips */}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      {pp.responsable && (
                        <span className="flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                          </svg>
                          {pp.responsable.nombre}
                        </span>
                      )}
                      {pp.hospital.zona && (
                        <span className="flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                          </svg>
                          Zona {pp.hospital.zona.nombre}
                        </span>
                      )}
                      {pp.hospital.direccion && (
                        <span className="flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          {pp.hospital.direccion}
                        </span>
                      )}
                      {(pp.fechaInicio || pp.fechaFinPlan) && (
                        <span className="flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          {fmtFecha(pp.fechaInicio)} → {fmtFecha(pp.fechaFinPlan)}
                          {duracionDias ? <span className="text-gray-400"> · {duracionDias} días</span> : null}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: budget */}
                  {pp.presupuesto != null && (
                    <div className="shrink-0 lg:text-right bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Presupuesto</p>
                      <p className="text-3xl font-bold tabular-nums" style={{ color: TEAL }}>
                        {pp.presupuesto.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                      </p>
                      {pp.fechaFinReal && (
                        <p className="text-xs font-semibold text-green-600 mt-2 flex items-center gap-1 justify-end">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Entregado: {fmtFecha(pp.fechaFinReal)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {pp.fases.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-gray-50">
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span className="font-medium">{fasesOK} de {pp.fases.length} fases completadas</span>
                      <span className="font-bold" style={{ color: pct === 100 ? "#16a34a" : TEAL }}>{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#16a34a" : TEAL }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Header card -- solo impresion */}
        <div className="hidden print:block bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: estadoStyle.bg, color: estadoStyle.text }}>{ESTADO_LABEL[pp.estado]}</span>
                {pp.prioridad > 0 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50" style={{ color: PRIORIDAD[pp.prioridad]?.color }}>{PRIORIDAD[pp.prioridad]?.label}</span>}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{pp.titulo}</h2>
              <p className="text-gray-600">
                <span className="font-semibold text-gray-800">{pp.hospital.nombre}</span>
                {" · "}{pp.hospital.ciudad}{pp.hospital.provincia ? `, ${pp.hospital.provincia}` : ""}
                {pp.hospital.tipo && <> · <span className="text-gray-500">{TIPO_H_LABEL[pp.hospital.tipo] ?? pp.hospital.tipo}</span></>}
                {pp.hospital.camas ? ` · ${pp.hospital.camas} camas` : ""}
              </p>
              <p className="text-sm text-gray-400 mt-0.5">
                {pp.responsable && <><span className="font-medium text-gray-600">{pp.responsable.nombre}</span>{" · "}</>}
                {pp.hospital.zona && <>Zona: <span className="font-medium text-gray-600">{pp.hospital.zona.nombre}</span></>}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {pp.presupuesto != null && <p className="text-2xl font-bold text-gray-900">{pp.presupuesto.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</p>}
              <p className="text-sm text-gray-400">{fmtFecha(pp.fechaInicio)} → {fmtFecha(pp.fechaFinPlan)}</p>
              {pp.fechaFinReal && <p className="text-xs font-semibold text-green-600 mt-0.5">Entregado: {fmtFecha(pp.fechaFinReal)}</p>}
            </div>
          </div>
          <div className="mt-5">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>{fasesOK} de {pp.fases.length} fases completadas</span>
              <span className="font-bold" style={{ color: pct === 100 ? "#16a34a" : TEAL }}>{pct}%</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#16a34a" : TEAL }} />
            </div>
          </div>
        </div>

        {/* -- KPI cards ----------------------------------------- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Progreso",  val: `${pct}%`,                          sub: `${fasesOK}/${pp.fases.length} fases`,                                                       color: pct === 100 ? "#16a34a" : TEAL },
            { label: "Hardware",  val: `${pp.hardwareUnidades.length} uds`, sub: totalHW > 0 ? totalHW.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }) : "Sin precios registrados", color: "#7c3aed" },
            { label: "Visitas",   val: `${pp.visitas.length}`,              sub: `${visitasOK} completadas`,                                                                  color: "#0369a1" },
            { label: "Duración",  val: duracionDias ? `${duracionDias} d` : "—", sub: duracionDias ? "días planificados" : (pp.fechaFinReal ? "Entregado" : "Sin fechas"),    color: ORANGE },
          ].map(k => (
            <div key={k.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="h-1 w-full" style={{ backgroundColor: k.color }} />
              <div className="p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{k.label}</p>
                <p className="text-2xl font-bold leading-none" style={{ color: k.color }}>{k.val}</p>
                <p className="text-xs text-gray-400 mt-1.5">{k.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* -- Share banner ---------------------------------------- */}
        {pp.shareToken && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border print:hidden"
            style={{ backgroundColor: `${TEAL}08`, borderColor: `${TEAL}30` }}>
            <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: TEAL }} />
            <p className="text-xs text-gray-600 flex-1">Enlace público activo — cualquier persona con el enlace puede ver este resumen</p>
            <button onClick={() => setShareModal(true)} className="text-xs font-semibold shrink-0" style={{ color: TEAL }}>Gestionar</button>
          </div>
        )}

        {/* -- MAPA (ahora arriba, pieza clave) ------------------- */}

        {/* Map */}
        {pp.mapaHtml ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Map toolbar */}
            <div
              className={`px-5 py-3 flex items-center justify-between print:hidden bg-gray-50/60 transition-colors ${mapaExpanded ? "border-b border-gray-100" : ""}`}>
              <button
                onClick={() => setMapaExpanded(v => !v)}
                className="flex items-center gap-2 group min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TEAL }} />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Mapa de instalación</p>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  className="shrink-0 ml-0.5 transition-transform duration-200"
                  style={{ transform: mapaExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <div className="flex items-center gap-1.5">
                {mapaExpanded && (
                  <>
                    <button onClick={() => setFullscreen(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                        <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
                      </svg>
                      Pantalla completa
                    </button>
                    <button onClick={printMapa}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                      </svg>
                      Imprimir
                    </button>
                    <div className="w-px h-4 bg-gray-200" />
                  </>
                )}
                <button onClick={() => fileInputRef.current?.click()} disabled={savingMapa}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all disabled:opacity-40">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  {savingMapa ? "Guardando…" : "Actualizar"}
                </button>
              </div>
            </div>
            {mapaExpanded && (
              <iframe ref={mapRef} srcDoc={pp.mapaHtml} sandbox="allow-scripts"
                onLoad={handleMapLoad} className="w-full border-0 block" style={{ height: mapH }} title="Mapa de instalación" />
            )}
          </div>
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !savingMapa && fileInputRef.current?.click()}
            className="relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer print:hidden overflow-hidden group"
            style={{ borderColor: dragOver ? TEAL : "#e5e7eb", backgroundColor: dragOver ? `${TEAL}08` : "#fafafa" }}>
            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: "radial-gradient(circle, #00A99D 1px, transparent 1px)",
              backgroundSize: "24px 24px"
            }} />
            <div className="relative flex flex-col items-center justify-center py-14 px-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-200 shadow-sm"
                style={{ backgroundColor: dragOver ? `${TEAL}20` : "#f3f4f6" }}>
                {savingMapa ? (
                  <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={dragOver ? TEAL : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200">
                    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                    <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
                  </svg>
                )}
              </div>
              {savingMapa ? (
                <p className="text-sm font-semibold" style={{ color: TEAL }}>Cargando mapa…</p>
              ) : dragOver ? (
                <>
                  <p className="text-sm font-bold mb-1" style={{ color: TEAL }}>Suelta el fichero aquí</p>
                  <p className="text-xs text-gray-400">Se importará automáticamente</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Importar mapa de instalación</p>
                  <p className="text-xs text-gray-400 mb-5 max-w-xs">Arrastra un fichero <span className="font-mono font-bold">.html</span> aquí, o haz clic para abrirlo desde el explorador</p>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-opacity group-hover:opacity-90"
                      style={{ backgroundColor: TEAL }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Seleccionar fichero
                    </span>
                    <span className="text-xs text-gray-300">o arrastra aquí</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Fullscreen overlay */}
        {fullscreen && pp.mapaHtml && (
          <div className="fixed inset-0 z-50 flex flex-col print:hidden" style={{ backgroundColor: "#000" }}>
            <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ backgroundColor: "#111", borderBottom: "1px solid #222" }}>
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm" style={{ color: TEAL }}>Palex Medical · InLab</span>
                <span className="text-gray-500 text-xs">·</span>
                <span className="text-gray-300 text-xs">{pp.titulo}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={printMapa}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  Imprimir
                </button>
                <button onClick={() => setFullscreen(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
                    <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
                  </svg>
                  Cerrar
                </button>
              </div>
            </div>
            <iframe srcDoc={pp.mapaHtml} sandbox="allow-scripts"
              className="flex-1 border-0 w-full" title="Mapa pantalla completa" />
          </div>
        )}

        {/* -- Hospital (enriquecido) + Contactos --------------- */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Hospital card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between" style={{ backgroundColor: `${TEAL}06` }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${TEAL}18` }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{pp.hospital.nombre}</p>
                  {pp.hospital.tipo && (
                    <span className="text-[10px] font-bold text-blue-600">{TIPO_H_LABEL[pp.hospital.tipo] ?? pp.hospital.tipo}</span>
                  )}
                </div>
              </div>
              <Link href={`/hospitales/${pp.hospital.id}?from=proyecto&pid=${pp.id}`}
                className="text-xs font-semibold shrink-0 flex items-center gap-1 hover:opacity-70 transition-opacity"
                style={{ color: TEAL }}>
                Ver
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            </div>
            <div className="p-5 grid grid-cols-2 gap-x-4 gap-y-2.5">
              {[
                { label: "Ciudad", value: `${pp.hospital.ciudad}${pp.hospital.provincia ? `, ${pp.hospital.provincia}` : ""}` },
                pp.hospital.camas ? { label: "Camas", value: `${pp.hospital.camas}` } : null,
                pp.hospital.zona ? { label: "Zona", value: pp.hospital.zona.nombre } : null,
                pp.hospital.pais ? { label: "País", value: pp.hospital.pais } : null,
                pp.hospital.tipo ? { label: "Tipo", value: TIPO_H_LABEL[pp.hospital.tipo] ?? pp.hospital.tipo } : null,
              ].filter(Boolean).map((row) => row && (
                <div key={row.label}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{row.label}</p>
                  <p className="text-sm font-semibold text-gray-700">{row.value}</p>
                </div>
              ))}
              {pp.hospital.direccion && (
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Dirección</p>
                  <p className="text-sm font-semibold text-gray-700">{pp.hospital.direccion}</p>
                </div>
              )}
              {/* Mini stats del proyecto para este hospital */}
              <div className="col-span-2 mt-1 pt-3 border-t border-gray-50 grid grid-cols-3 gap-2">
                {[
                  { label: "Visitas", value: pp.visitas.length },
                  { label: "Contactos", value: pp.contactos.length },
                  { label: "Hardware", value: pp.hardwareUnidades.length },
                ].map(s => (
                  <div key={s.label} className="text-center rounded-xl py-2" style={{ backgroundColor: `${TEAL}08` }}>
                    <p className="text-base font-bold" style={{ color: TEAL }}>{s.value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contactos */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2.5" style={{ backgroundColor: "#f8fafc" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-purple-50">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-800">Contactos del proyecto</p>
              {pp.contactos.length > 0 && (
                <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">{pp.contactos.length}</span>
              )}
            </div>
            <div className="p-5">
              {pp.contactos.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <svg className="mx-auto mb-2 opacity-30" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  </svg>
                  <p className="text-sm">Sin contactos vinculados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pp.contactos.map(({ contacto: c }) => (
                    <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: TEAL }}>
                        {c.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">
                          {c.nombre}
                          {c.principal && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${TEAL}18`, color: TEAL }}>Principal</span>}
                        </p>
                        {c.cargo && <p className="text-xs text-gray-500 mt-0.5">{c.cargo}</p>}
                        <div className="flex gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
                          {c.email && <span className="truncate">{c.email}</span>}
                          {c.telefono && <span>{c.telefono}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* -- Hardware table ------------------------------------ */}
        {pp.hardwareUnidades.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2.5" style={{ backgroundColor: "#faf5ff" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-purple-100">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-800">Inventario de hardware</p>
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">{pp.hardwareUnidades.length} uds</span>
              {totalHW > 0 && <span className="text-sm font-bold" style={{ color: "#7c3aed" }}>{totalHW.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</span>}
            </div>
            <div className="p-6 space-y-5">
              {Object.entries(byTipo).map(([tipo, units]) => {
                const subtotal = units.reduce((s, u) => s + (u.catalogo.precio ?? 0), 0)
                return (
                  <div key={tipo}>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                      {HW_TIPO_LABEL[tipo] ?? tipo} <span className="font-normal text-gray-400">({units.length})</span>
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            {["Modelo", "N/S", "Estado", "Precio/ud"].map((h, i) => (
                              <th key={h} className={`text-xs font-semibold text-gray-400 pb-2 ${i === 3 ? "text-right" : "text-left pr-4"}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {units.map(u => (
                            <tr key={u.id} className="border-b border-gray-50 last:border-0">
                              <td className="py-2 pr-4 font-medium text-gray-800">{u.catalogo.marca} {u.catalogo.modelo}</td>
                              <td className="py-2 pr-4 font-mono text-xs text-gray-500">{u.numSerie ?? "—"}</td>
                              <td className="py-2 pr-4">
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                  style={u.estado === "ASIGNADO" ? { backgroundColor: `${TEAL}18`, color: TEAL } : { backgroundColor: "#f3f4f6", color: "#6b7280" }}>
                                  {HW_ESTADO[u.estado]?.label ?? u.estado}
                                </span>
                              </td>
                              <td className="py-2 text-right text-gray-600">
                                {u.catalogo.precio != null ? u.catalogo.precio.toLocaleString("es-ES", { style: "currency", currency: "EUR" }) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {subtotal > 0 && (
                          <tfoot>
                            <tr className="border-t border-gray-200">
                              <td colSpan={3} className="pt-2 text-xs font-semibold text-gray-500">Subtotal</td>
                              <td className="pt-2 text-right font-bold text-gray-800">{subtotal.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
            {totalHW > 0 && (
              <div className="mx-6 mb-5 pt-4 border-t-2 border-gray-200 flex justify-between items-center">
                <span className="font-bold text-gray-700">Total hardware</span>
                <span className="text-xl font-bold" style={{ color: "#7c3aed" }}>{totalHW.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</span>
              </div>
            )}
          </div>
        )}

        {/* -- Visitas ------------------------------------------- */}
        {pp.visitas.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2.5" style={{ backgroundColor: "#f0f9ff" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-blue-100">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-800">Visitas del proyecto</p>
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">{pp.visitas.length}</span>
              <span className="text-xs text-gray-400">{visitasOK} completadas</span>
            </div>
            <div className="p-5 space-y-2">
              {pp.visitas.slice(0, 6).map(v => (
                <div key={v.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={v.estado === "COMPLETADA" ? { backgroundColor: "#f0fdf4", color: "#16a34a" }
                           : v.estado === "BORRADOR"   ? { backgroundColor: "#fffbeb", color: "#d97706" }
                           :                             { backgroundColor: "#f3f4f6", color: "#6b7280" }}>
                      {v.estado}
                    </span>
                    <span className="text-xs text-gray-500">{v.tipo}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{fmtFecha(v.fecha)}</p>
                    <p className="text-xs text-gray-400">{v.usuario.nombre}</p>
                  </div>
                </div>
              ))}
              {pp.visitas.length > 6 && <p className="text-xs text-center text-gray-400 pt-1">+{pp.visitas.length - 6} visitas más</p>}
            </div>
          </div>
        )}

        {/* -- FASES (al final, como solicitado) ----------------- */}
        {pp.fases.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2.5" style={{ backgroundColor: `${TEAL}06` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${TEAL}18` }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-800">Fases del proyecto</p>
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${TEAL}18`, color: TEAL }}>
                {fasesOK}/{pp.fases.length} completadas
              </span>
            </div>
            <div className="p-5 space-y-1.5">
              {pp.fases.map((f, idx) => {
                const s = FASE_ESTADO_COLOR[f.estado] ?? FASE_ESTADO_COLOR.PENDIENTE
                return (
                  <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: s.bg }}>
                    <span className="text-[10px] font-bold text-gray-300 w-5 shrink-0 text-right tabular-nums">{idx + 1}</span>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">{f.nombre}</span>
                    <span className="text-xs font-semibold shrink-0" style={{ color: s.text }}>
                      {f.estado === "PENDIENTE" ? "Pendiente" : f.estado === "EN_PROGRESO" ? "En progreso" : f.estado === "COMPLETADO" ? "Completado" : "Bloqueado"}
                    </span>
                    {(f.fechaReal ?? f.fechaPlan) && (
                      <span className="text-xs text-gray-400 shrink-0 hidden sm:block">{fmtFecha(f.fechaReal ?? f.fechaPlan)}</span>
                    )}
                  </div>
                )
              })}
            </div>
            {pp.hitos.length > 0 && (
              <div className="px-5 pb-5 pt-0">
                <div className="pt-4 border-t border-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Hitos</p>
                  <div className="flex flex-wrap gap-2">
                    {pp.hitos.map(h => (
                      <span key={h.id} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border"
                        style={h.completado ? { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0", color: "#16a34a" } : { backgroundColor: "#fffbeb", borderColor: "#fde68a", color: "#d97706" }}>
                        {h.completado ? "✓" : "◇"} {h.titulo} · {fmtFecha(h.fecha)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* -- Notas --------------------------------------------- */}
        {(pp.descripcion || pp.notas) && (
          <div className="grid sm:grid-cols-2 gap-4">
            {pp.descripcion && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Descripción</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{pp.descripcion}</p>
              </div>
            )}
            {pp.notas && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Notas internas</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{pp.notas}</p>
              </div>
            )}
          </div>
        )}

        {/* Print footer */}
        <div className="hidden print:flex items-center justify-between pt-5 border-t border-gray-200 text-xs text-gray-400">
          <span>Palex Medical · InLab — Confidencial</span>
          <span>Generado: {genDate}</span>
        </div>
      </div>

      {/* Share modal */}
      {shareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) setShareModal(false) }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Compartir proyecto</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Cualquier persona con el enlace puede ver el resumen sin iniciar sesión</p>
                </div>
                <button onClick={() => setShareModal(false)} className="text-gray-300 hover:text-gray-500 transition-colors p-1 -mt-1 -mr-1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {pp.shareToken ? (
                <div className="space-y-4">
                  {/* Status pill */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: `${TEAL}10` }}>
                    <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: TEAL }} />
                    <span className="text-xs font-semibold" style={{ color: TEAL }}>Enlace activo</span>
                    <span className="text-xs text-gray-400 ml-auto">Se puede acceder sin login</span>
                  </div>

                  {/* URL box */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Enlace público</p>
                    <p className="text-xs font-mono text-gray-600 break-all leading-relaxed">{shareUrl}</p>
                  </div>

                  {/* QR Code */}
                  {qrDataUrl && (
                    <div className="flex flex-col items-center gap-3 py-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest self-start">Código QR</p>
                      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                        <img src={qrDataUrl} alt="QR del proyecto" width={180} height={180} className="block" />
                      </div>
                      <a href={qrDataUrl} download={`qr-${pp.id}.png`}
                        className="text-xs font-semibold underline" style={{ color: TEAL }}>
                        Descargar QR
                      </a>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={copyLink}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                      style={{ backgroundColor: copied ? "#16a34a" : TEAL }}>
                      {copied ? (
                        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copiado</>
                      ) : (
                        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar enlace</>
                      )}
                    </button>
                    <a href={shareUrl ?? "#"} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors hover:bg-teal-50"
                      style={{ borderColor: TEAL, color: TEAL }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                      Abrir enlace
                    </a>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <button onClick={revokeShare} disabled={revoking}
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 border border-red-100 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors">
                      {revoking ? "Revocando…" : "Revocar enlace público"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Empty state */}
                  <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Sin enlace generado</p>
                    <p className="text-xs text-gray-400">Genera un enlace único para compartir este proyecto con cualquier persona</p>
                  </div>
                  <button onClick={generateShare} disabled={generando}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                    style={{ backgroundColor: TEAL }}>
                    {generando ? (
                      <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Generando enlace…</>
                    ) : (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Generar enlace público</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for map import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm"
        className="hidden"
        onChange={handleFileSelect}
      />

    </div>
  )
}

