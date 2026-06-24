"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Image from "next/image"
import { TEAL } from "@/lib/brand"
import { usePerfil } from "@/hooks/usePerfil"

interface Step {
  title: string
  description: string
  icon: React.ReactNode
}

function IconWelcome() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <circle cx="40" cy="40" r="38" stroke={TEAL} strokeWidth="2" opacity="0.15" />
      <circle cx="40" cy="40" r="28" stroke={TEAL} strokeWidth="2" opacity="0.3" />
      <path d="M40 20v20l12 8" stroke={TEAL} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="40" cy="40" r="4" fill={TEAL} />
      <path d="M28 56c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke={TEAL} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  )
}

function IconDashboard() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <rect x="10" y="14" width="26" height="22" rx="4" stroke={TEAL} strokeWidth="2" />
      <rect x="44" y="14" width="26" height="10" rx="4" stroke={TEAL} strokeWidth="2" />
      <rect x="44" y="30" width="26" height="22" rx="4" stroke={TEAL} strokeWidth="2" />
      <rect x="10" y="42" width="26" height="10" rx="4" stroke={TEAL} strokeWidth="2" />
      <rect x="10" y="58" width="60" height="10" rx="4" stroke={TEAL} strokeWidth="2" opacity="0.5" />
      <line x1="16" y1="22" x2="30" y2="22" stroke={TEAL} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="16" y1="28" x2="24" y2="28" stroke={TEAL} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <circle cx="57" cy="41" r="5" fill={TEAL} opacity="0.2" />
      <path d="M55 41l2 2 4-4" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconNavigation() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <rect x="8" y="12" width="20" height="56" rx="4" stroke={TEAL} strokeWidth="2" />
      <line x1="14" y1="24" x2="22" y2="24" stroke={TEAL} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="14" y1="32" x2="22" y2="32" stroke={TEAL} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="14" y1="40" x2="22" y2="40" stroke={TEAL} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="14" y1="48" x2="22" y2="48" stroke={TEAL} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <circle cx="18" cy="18" r="3" fill={TEAL} opacity="0.3" />
      <rect x="34" y="12" width="38" height="12" rx="4" stroke={TEAL} strokeWidth="2" opacity="0.5" />
      <rect x="40" y="34" width="26" height="16" rx="4" fill={TEAL} opacity="0.12" />
      <text x="53" y="45" textAnchor="middle" fill={TEAL} fontSize="9" fontWeight="bold" fontFamily="monospace">Cmd+K</text>
      <circle cx="53" cy="62" r="8" stroke={TEAL} strokeWidth="2" opacity="0.5" />
      <path d="M53 56a6 6 0 000 12 4 4 0 100-12z" fill={TEAL} opacity="0.2" />
    </svg>
  )
}

function IconHospitales() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <rect x="14" y="24" width="52" height="40" rx="4" stroke={TEAL} strokeWidth="2" />
      <rect x="32" y="10" width="16" height="18" rx="3" stroke={TEAL} strokeWidth="2" />
      <line x1="40" y1="16" x2="40" y2="24" stroke={TEAL} strokeWidth="2" strokeLinecap="round" />
      <line x1="36" y1="20" x2="44" y2="20" stroke={TEAL} strokeWidth="2" strokeLinecap="round" />
      <rect x="22" y="34" width="10" height="10" rx="2" fill={TEAL} opacity="0.15" />
      <rect x="35" y="34" width="10" height="10" rx="2" fill={TEAL} opacity="0.15" />
      <rect x="48" y="34" width="10" height="10" rx="2" fill={TEAL} opacity="0.15" />
      <rect x="34" y="50" width="12" height="14" rx="2" stroke={TEAL} strokeWidth="2" opacity="0.5" />
      <circle cx="58" cy="20" r="6" fill={TEAL} opacity="0.2" />
      <path d="M55.5 20l2 2 3.5-3.5" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconVisitas() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <rect x="18" y="16" width="44" height="52" rx="4" stroke={TEAL} strokeWidth="2" />
      <rect x="30" y="10" width="20" height="12" rx="3" stroke={TEAL} strokeWidth="2" fill="white" />
      <circle cx="40" cy="16" r="2" fill={TEAL} />
      <line x1="26" y1="32" x2="54" y2="32" stroke={TEAL} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="26" y1="40" x2="48" y2="40" stroke={TEAL} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="26" y1="48" x2="50" y2="48" stroke={TEAL} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <circle cx="54" cy="56" r="8" fill={TEAL} opacity="0.15" />
      <path d="M50 56l3 3 6-6" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconProyectos() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <rect x="8" y="16" width="18" height="48" rx="4" stroke={TEAL} strokeWidth="2" opacity="0.5" />
      <rect x="31" y="16" width="18" height="48" rx="4" stroke={TEAL} strokeWidth="2" opacity="0.5" />
      <rect x="54" y="16" width="18" height="48" rx="4" stroke={TEAL} strokeWidth="2" opacity="0.5" />
      <rect x="11" y="22" width="12" height="10" rx="2" fill={TEAL} opacity="0.2" />
      <rect x="11" y="36" width="12" height="8" rx="2" fill={TEAL} opacity="0.12" />
      <rect x="34" y="22" width="12" height="14" rx="2" fill={TEAL} opacity="0.25" />
      <rect x="34" y="40" width="12" height="10" rx="2" fill={TEAL} opacity="0.15" />
      <rect x="57" y="22" width="12" height="8" rx="2" fill={TEAL} opacity="0.18" />
      <rect x="8" y="68" width="64" height="4" rx="2" fill={TEAL} opacity="0.1" />
      <rect x="8" y="68" width="42" height="4" rx="2" fill={TEAL} opacity="0.4" />
    </svg>
  )
}

function IconHerramientas() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      {/* Phone outline */}
      <rect x="24" y="10" width="32" height="56" rx="6" stroke={TEAL} strokeWidth="2" />
      <line x1="24" y1="20" x2="56" y2="20" stroke={TEAL} strokeWidth="1.5" opacity="0.3" />
      <line x1="24" y1="56" x2="56" y2="56" stroke={TEAL} strokeWidth="1.5" opacity="0.3" />
      {/* Phone icon */}
      <path d="M32 30c0-1 .5-1.5 1.5-1.5h2c.5 0 1 .3 1.2.7l1.3 2.3c.2.4.1.9-.2 1.2l-1 .8c1 2 2.5 3.5 4.5 4.5l.8-1c.3-.3.8-.4 1.2-.2l2.3 1.3c.4.2.7.7.7 1.2v2c0 1-.5 1.5-1.5 1.5C37 42.8 32 37 32 30z" fill={TEAL} opacity="0.3" />
      {/* Calendar mini */}
      <rect x="34" y="44" width="12" height="10" rx="2" stroke={TEAL} strokeWidth="1.5" opacity="0.5" />
      <line x1="37" y1="44" x2="37" y2="42" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="43" y1="44" x2="43" y2="42" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <circle cx="38" cy="50" r="1" fill={TEAL} opacity="0.4" />
      <circle cx="42" cy="50" r="1" fill={TEAL} opacity="0.4" />
      {/* Bottom bar */}
      <rect x="30" y="59" width="20" height="3" rx="1.5" fill={TEAL} opacity="0.2" />
      {/* Bell notification */}
      <circle cx="60" cy="16" r="8" fill={TEAL} opacity="0.12" />
      <path d="M57.5 16a2.5 2.5 0 015 0v2h-5v-2z" stroke={TEAL} strokeWidth="1.2" fill="none" opacity="0.6" />
      <line x1="57" y1="18" x2="63" y2="18" stroke={TEAL} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <circle cx="60" cy="20" r="0.8" fill={TEAL} opacity="0.5" />
    </svg>
  )
}

function IconAdmin() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      {/* Gear */}
      <circle cx="40" cy="38" r="16" stroke={TEAL} strokeWidth="2" opacity="0.3" />
      <circle cx="40" cy="38" r="8" stroke={TEAL} strokeWidth="2" />
      {/* Gear teeth */}
      <rect x="38" y="16" width="4" height="8" rx="1" fill={TEAL} opacity="0.4" />
      <rect x="38" y="52" width="4" height="8" rx="1" fill={TEAL} opacity="0.4" />
      <rect x="18" y="36" width="8" height="4" rx="1" fill={TEAL} opacity="0.4" />
      <rect x="54" y="36" width="8" height="4" rx="1" fill={TEAL} opacity="0.4" />
      {/* Users */}
      <circle cx="22" cy="62" r="4" stroke={TEAL} strokeWidth="1.5" opacity="0.5" />
      <path d="M16 70c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
      <circle cx="40" cy="62" r="4" stroke={TEAL} strokeWidth="1.5" opacity="0.5" />
      <path d="M34 70c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
      <circle cx="58" cy="62" r="4" stroke={TEAL} strokeWidth="1.5" opacity="0.5" />
      <path d="M52 70c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  )
}

function IconSupervision() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      {/* Chart area */}
      <rect x="10" y="14" width="60" height="40" rx="4" stroke={TEAL} strokeWidth="2" />
      {/* Bars */}
      <rect x="18" y="32" width="8" height="18" rx="2" fill={TEAL} opacity="0.2" />
      <rect x="30" y="24" width="8" height="26" rx="2" fill={TEAL} opacity="0.3" />
      <rect x="42" y="20" width="8" height="30" rx="2" fill={TEAL} opacity="0.4" />
      <rect x="54" y="28" width="8" height="22" rx="2" fill={TEAL} opacity="0.25" />
      {/* Trend line */}
      <polyline points="22,30 34,22 46,18 58,26" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
      {/* Alert badge */}
      <circle cx="62" cy="18" r="6" fill={TEAL} opacity="0.15" />
      <text x="62" y="21" textAnchor="middle" fill={TEAL} fontSize="9" fontWeight="bold">!</text>
      {/* Heatmap dots */}
      <circle cx="20" cy="64" r="4" fill={TEAL} opacity="0.15" />
      <circle cx="32" cy="64" r="4" fill={TEAL} opacity="0.3" />
      <circle cx="44" cy="64" r="4" fill={TEAL} opacity="0.45" />
      <circle cx="56" cy="64" r="4" fill={TEAL} opacity="0.2" />
      <circle cx="20" cy="72" r="4" fill={TEAL} opacity="0.35" />
      <circle cx="32" cy="72" r="4" fill={TEAL} opacity="0.1" />
      <circle cx="44" cy="72" r="4" fill={TEAL} opacity="0.25" />
      <circle cx="56" cy="72" r="4" fill={TEAL} opacity="0.4" />
    </svg>
  )
}

function IconSeguridad() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      {/* Shield */}
      <path d="M40 12L16 24v16c0 14.4 10.2 27.8 24 32 13.8-4.2 24-17.6 24-32V24L40 12z" stroke={TEAL} strokeWidth="2" fill="none" />
      <path d="M40 18L22 28v12c0 11.5 7.7 22.2 18 25.6 10.3-3.4 18-14.1 18-25.6V28L40 18z" fill={TEAL} opacity="0.08" />
      {/* Checkmark inside */}
      <path d="M32 40l5 5 11-11" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Key */}
      <circle cx="60" cy="60" r="6" stroke={TEAL} strokeWidth="1.5" opacity="0.4" />
      <line x1="54" y1="60" x2="46" y2="60" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="48" y1="60" x2="48" y2="56" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="52" y1="60" x2="52" y2="56" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

function IconReady() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <circle cx="40" cy="40" r="30" stroke={TEAL} strokeWidth="2" />
      <circle cx="40" cy="40" r="22" fill={TEAL} opacity="0.1" />
      <path d="M30 40l7 7 14-14" stroke={TEAL} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="62" cy="18" r="2" fill={TEAL} opacity="0.4" />
      <circle cx="18" cy="22" r="1.5" fill={TEAL} opacity="0.3" />
      <circle cx="66" cy="50" r="1.5" fill={TEAL} opacity="0.3" />
      <circle cx="14" cy="54" r="2" fill={TEAL} opacity="0.25" />
    </svg>
  )
}

function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}

function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
    </svg>
  )
}

const GENERAL_STEPS: Step[] = [
  {
    title: "Bienvenido a tu plataforma",
    description:
      "Esta es tu plataforma de planificacion y gestion de proyectos hospitalarios. Desde aqui podras coordinar visitas tecnicas, hacer seguimiento de proyectos, gestionar equipamiento y mantener toda la informacion de tus centros hospitalarios organizada en un solo lugar.",
    icon: <IconWelcome />,
  },
  {
    title: "Tu panel principal",
    description:
      "El Dashboard es tu punto de partida cada dia. Muestra tus KPIs mas importantes (visitas realizadas, proyectos activos, tareas pendientes) y el widget \"Mi Dia\" con un resumen de todo lo que tienes para hoy: visitas programadas, tareas vencidas, recordatorios y llamadas de seguimiento.",
    icon: <IconDashboard />,
  },
  {
    title: "Navegacion y busqueda",
    description:
      "Usa la barra lateral izquierda para moverte entre secciones. Pulsa Cmd+K (o Ctrl+K) para abrir la busqueda rapida y encontrar hospitales, visitas o proyectos al instante. Desde la barra superior puedes alternar entre modo claro y oscuro, y ver tus notificaciones pendientes.",
    icon: <IconNavigation />,
  },
  {
    title: "Gestion de hospitales",
    description:
      "En la seccion Hospitales encontraras todos tus centros asignados con sus contactos, historial de visitas y timeline de actividad. Puedes marcar hospitales como favoritos para acceso rapido, generar codigos QR para cada centro y filtrar por zona geografica. Cada hospital tiene su ficha completa con KPIs de visitas y equipamiento instalado.",
    icon: <IconHospitales />,
  },
  {
    title: "Visitas tecnicas",
    description:
      "Crea visitas tecnicas a hospitales con un formulario completo de 13 secciones: desde datos generales hasta termografia y firma digital. Puedes adjuntar fotos, generar informes PDF profesionales, trabajar sin conexion a internet y usar plantillas para agilizar la documentacion. El calendario mensual te da una vista general de todas tus visitas programadas.",
    icon: <IconVisitas />,
  },
  {
    title: "Seguimiento de proyectos",
    description:
      "Cada proyecto tiene 10 pestanas especializadas: cockpit con KPIs, fases con hitos, tareas asignables, timeline de actividad, solicitudes de material, contactos, modulos y mas. Usa la vista Kanban para organizar visualmente tus proyectos por estado, y exporta a Excel cuando necesites compartir informacion fuera de la plataforma.",
    icon: <IconProyectos />,
  },
  {
    title: "Herramientas de campo",
    description:
      "La plataforma esta pensada para usar en movilidad. Registra llamadas rapidas con hospitales, crea recordatorios personales con fechas de seguimiento, y sincroniza tu calendario con Google Calendar, Outlook o Apple Calendar via iCal. En movil, la barra inferior te da acceso directo a las secciones mas usadas con un solo toque.",
    icon: <IconHerramientas />,
  },
]

const ADMIN_STEPS: Step[] = [
  {
    title: "Panel de administracion",
    description:
      "Como administrador, tienes acceso completo a la gestion de usuarios, zonas geograficas, hardware y configuracion general. Puedes crear y editar usuarios, asignar zonas, gestionar el catalogo de equipamiento, configurar etiquetas de color para visitas y proyectos, y consultar el log de actividad con todas las acciones realizadas en la plataforma.",
    icon: <IconAdmin />,
  },
  {
    title: "Supervision del equipo",
    description:
      "El panel de equipo te muestra la carga de trabajo de cada usuario: visitas realizadas, proyectos activos y ultimo acceso. El heatmap de carga de trabajo es un calendario visual que te permite identificar picos de actividad y distribuir mejor las tareas. Tambien recibiras alertas automaticas cuando haya garantias de hardware vencidas o mantenimientos pendientes.",
    icon: <IconSupervision />,
  },
  {
    title: "Seguridad y permisos",
    description:
      "El sistema de roles controla el acceso a cada seccion: los tecnicos ven solo sus hospitales y visitas por zona, mientras tu como administrador tienes visibilidad total. Puedes desactivar usuarios (pierden acceso en menos de 5 minutos), reiniciar su onboarding, y cambiar roles sin que necesiten volver a iniciar sesion. Toda la actividad queda registrada en el log.",
    icon: <IconSeguridad />,
  },
]

const FINAL_STEP: Step = {
  title: "Todo listo para empezar",
  description:
    "Ya conoces las herramientas principales. Cada seccion cuenta con filtros, busqueda y atajos de teclado para que trabajes de forma eficiente. Explora la plataforma a tu ritmo y recuerda que puedes usar Cmd+K en cualquier momento para encontrar lo que necesites rapidamente.",
  icon: <IconReady />,
}

export function OnboardingWizard() {
  const { perfil, rol, isLoading: perfilLoading } = usePerfil()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<"next" | "prev">("next")
  const [animating, setAnimating] = useState(false)
  const [saving, setSaving] = useState(false)

  const steps = useMemo(() => {
    const base = [...GENERAL_STEPS]
    if (rol === "ADMIN") base.push(...ADMIN_STEPS)
    base.push(FINAL_STEP)
    return base
  }, [rol])

  useEffect(() => {
    if (!perfilLoading && perfil && perfil.onboardingCompletado === false) {
      setVisible(true)
    }
  }, [perfilLoading, perfil])

  const markCompleted = useCallback(async () => {
    setSaving(true)
    try {
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completado: true }),
      })
    } catch {
      // fail silently
    }
    setSaving(false)
    setVisible(false)
  }, [])

  const goNext = useCallback(() => {
    if (animating) return
    if (step === steps.length - 1) return
    setDirection("next")
    setAnimating(true)
    setTimeout(() => {
      setStep(s => s + 1)
      setAnimating(false)
    }, 200)
  }, [step, steps.length, animating])

  const goPrev = useCallback(() => {
    if (animating) return
    if (step === 0) return
    setDirection("prev")
    setAnimating(true)
    setTimeout(() => {
      setStep(s => s - 1)
      setAnimating(false)
    }, 200)
  }, [step, animating])

  useEffect(() => {
    if (!visible) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        if (step < steps.length - 1) goNext()
      }
      if (e.key === "ArrowLeft") goPrev()
      if (e.key === "Escape") void markCompleted()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [visible, step, steps.length, goNext, goPrev, markCompleted])

  if (perfilLoading || !visible) return null

  const isFirst = step === 0
  const isLast = step === steps.length - 1
  const current = steps[step]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative"
        role="dialog"
        aria-modal="true"
        aria-label="Onboarding"
      >
        <button
          onClick={() => void markCompleted()}
          className="absolute top-4 right-4 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
          disabled={saving}
        >
          Saltar
        </button>

        <div className="flex items-center justify-center gap-1.5 pt-6 pb-2">
          {steps.map((_, i) => (
            <span
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                backgroundColor: i === step ? TEAL : i < step ? TEAL : undefined,
                opacity: i === step ? 1 : i < step ? 0.4 : undefined,
              }}
            >
              {i !== step && i >= step && (
                <span className="block w-full h-full rounded-full bg-gray-200 dark:bg-gray-700" />
              )}
            </span>
          ))}
        </div>

        <div
          className="px-8 pt-6 pb-4 flex flex-col items-center text-center transition-all duration-200"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating
              ? direction === "next"
                ? "translateX(-20px)"
                : "translateX(20px)"
              : "translateX(0)",
          }}
        >
          <div className="mb-5">
            {step === 0 ? (
              <div className="flex flex-col items-center gap-3">
                <Image
                  src="/logo-palex.png"
                  alt="Palex Medical"
                  width={120}
                  height={40}
                  className="h-10 w-auto"
                  priority
                />
                <div className="mt-2">{current.icon}</div>
              </div>
            ) : (
              current.icon
            )}
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            {current.title}
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm">
            {current.description}
          </p>
        </div>

        <div className="text-center pb-2">
          <span className="text-xs text-gray-300 dark:text-gray-600 font-medium">
            {step + 1} / {steps.length}
          </span>
        </div>

        <div className="px-8 pb-8 flex items-center gap-3">
          {!isFirst && (
            <button
              onClick={goPrev}
              disabled={animating}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors min-h-[44px]"
            >
              <IconArrowLeft className="w-4 h-4" />
              Anterior
            </button>
          )}

          <div className="flex-1" />

          {isLast ? (
            <button
              onClick={() => void markCompleted()}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 min-h-[44px]"
              style={{ backgroundColor: TEAL }}
            >
              {saving ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : null}
              Comenzar
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={animating}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 min-h-[44px]"
              style={{ backgroundColor: TEAL }}
            >
              Siguiente
              <IconArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
