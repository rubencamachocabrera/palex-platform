import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateCalendarToken } from "@/lib/calendar-token"

/** Escape special chars for iCal text fields */
function icalEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n")
}

/** Format a Date to iCal DTSTART/DTEND format: YYYYMMDDTHHMMSSZ */
function toICalDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

/** Format a Date to iCal all-day format: YYYYMMDD */
function toICalDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "")
}

/** Fold long iCal lines at 75 octets per RFC 5545 */
function foldLine(line: string): string {
  if (line.length <= 75) return line
  const parts: string[] = []
  parts.push(line.slice(0, 75))
  let i = 75
  while (i < line.length) {
    parts.push(" " + line.slice(i, i + 74))
    i += 74
  }
  return parts.join("\r\n")
}

// GET /api/calendario/ical?uid=xxx&token=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const uid = searchParams.get("uid")
    const token = searchParams.get("token")

    if (!uid || !token) {
      return NextResponse.json(
        { error: "Parametros uid y token requeridos" },
        { status: 400 }
      )
    }

    // Verify token matches the userId
    const expectedToken = generateCalendarToken(uid)
    if (token !== expectedToken) {
      return NextResponse.json({ error: "Token invalido" }, { status: 401 })
    }

    // Verify user exists
    const usuario = await db.usuario.findUnique({
      where: { id: uid },
      select: { id: true, nombre: true },
    })
    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    const now = new Date()
    const past30 = new Date(now)
    past30.setDate(past30.getDate() - 30)
    const future90 = new Date(now)
    future90.setDate(future90.getDate() + 90)

    // Fetch visitas, recordatorios, and hitos in parallel
    const [visitas, recordatorios, hitos] = await Promise.all([
      // Visitas: user's own visitas in the date range
      db.visita.findMany({
        where: {
          usuarioId: uid,
          fecha: { gte: past30, lte: future90 },
        },
        select: {
          id: true,
          titulo: true,
          tipo: true,
          estado: true,
          fecha: true,
          hospital: { select: { nombre: true, ciudad: true } },
        },
        orderBy: { fecha: "asc" },
      }),

      // Recordatorios: non-completed for this user
      db.recordatorio.findMany({
        where: {
          usuarioId: uid,
          completado: false,
        },
        select: {
          id: true,
          titulo: true,
          descripcion: true,
          fecha: true,
        },
        orderBy: { fecha: "asc" },
      }),

      // Hitos: from active proyectos where user is responsable
      db.hito.findMany({
        where: {
          proyecto: {
            responsableId: uid,
            estado: { in: ["NUEVO", "EN_CURSO", "PAUSADO"] },
          },
        },
        select: {
          id: true,
          titulo: true,
          fecha: true,
          completado: true,
          proyecto: { select: { titulo: true } },
        },
        orderBy: { fecha: "asc" },
      }),
    ])

    // Build iCal
    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//InLab Palex//Calendar//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:InLab Palex",
    ]

    // Visitas
    for (const v of visitas) {
      const dtStart = new Date(v.fecha)
      const dtEnd = new Date(dtStart.getTime() + 2 * 60 * 60 * 1000) // +2h
      const summary = v.titulo || `Visita ${v.hospital.nombre}`
      const location = [v.hospital.nombre, v.hospital.ciudad]
        .filter(Boolean)
        .join(", ")
      const description = [`Tipo: ${v.tipo}`, `Estado: ${v.estado}`].join(
        "\\n"
      )

      lines.push("BEGIN:VEVENT")
      lines.push(`UID:visita-${v.id}@inlab-palex`)
      lines.push(`DTSTART:${toICalDateTime(dtStart)}`)
      lines.push(`DTEND:${toICalDateTime(dtEnd)}`)
      lines.push(`SUMMARY:${icalEscape(summary)}`)
      if (location) lines.push(`LOCATION:${icalEscape(location)}`)
      lines.push(`DESCRIPTION:${icalEscape(description)}`)
      lines.push(`STATUS:${v.estado === "COMPLETADA" ? "COMPLETED" : "CONFIRMED"}`)
      lines.push("END:VEVENT")
    }

    // Recordatorios
    for (const r of recordatorios) {
      const dtStart = new Date(r.fecha)
      const dtEnd = new Date(dtStart.getTime() + 30 * 60 * 1000) // +30min
      const description = r.descripcion
        ? icalEscape(r.descripcion)
        : ""

      lines.push("BEGIN:VEVENT")
      lines.push(`UID:recordatorio-${r.id}@inlab-palex`)
      lines.push(`DTSTART:${toICalDateTime(dtStart)}`)
      lines.push(`DTEND:${toICalDateTime(dtEnd)}`)
      lines.push(`SUMMARY:${icalEscape(`Recordatorio: ${r.titulo}`)}`)
      if (description) lines.push(`DESCRIPTION:${description}`)
      // VALARM: 15 min before
      lines.push("BEGIN:VALARM")
      lines.push("TRIGGER:-PT15M")
      lines.push("ACTION:DISPLAY")
      lines.push(`DESCRIPTION:${icalEscape(r.titulo)}`)
      lines.push("END:VALARM")
      lines.push("END:VEVENT")
    }

    // Hitos (all-day events)
    for (const h of hitos) {
      const proyectoTitulo = h.proyecto.titulo
      const summary = `Hito: ${h.titulo} — ${proyectoTitulo}`

      lines.push("BEGIN:VEVENT")
      lines.push(`UID:hito-${h.id}@inlab-palex`)
      lines.push(`DTSTART;VALUE=DATE:${toICalDate(new Date(h.fecha))}`)
      lines.push(`SUMMARY:${icalEscape(summary)}`)
      lines.push(`STATUS:${h.completado ? "COMPLETED" : "TENTATIVE"}`)
      lines.push("END:VEVENT")
    }

    lines.push("END:VCALENDAR")

    // Fold long lines and join with CRLF per RFC 5545
    const ical = lines.map(foldLine).join("\r\n") + "\r\n"

    return new NextResponse(ical, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="inlab-calendar.ics"',
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("[GET /api/calendario/ical]", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
