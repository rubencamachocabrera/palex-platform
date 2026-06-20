"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { TEAL } from "@/lib/brand"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Step {
  title: string
  description: string
  icon: React.ReactNode
}

// ─── SVG Icons for each step ─────────────────────────────────────────────────

function IconWelcome() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <circle cx="40" cy="40" r="38" stroke={TEAL} strokeWidth="2" opacity="0.15" />
      <circle cx="40" cy="40" r="28" stroke={TEAL} strokeWidth="2" opacity="0.3" />
      <path
        d="M40 20v20l12 8"
        stroke={TEAL}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="40" cy="40" r="4" fill={TEAL} />
      <path
        d="M28 56c0-6.627 5.373-12 12-12s12 5.373 12 12"
        stroke={TEAL}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
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
      {/* Sidebar */}
      <rect x="8" y="12" width="20" height="56" rx="4" stroke={TEAL} strokeWidth="2" />
      <line x1="14" y1="24" x2="22" y2="24" stroke={TEAL} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="14" y1="32" x2="22" y2="32" stroke={TEAL} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="14" y1="40" x2="22" y2="40" stroke={TEAL} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="14" y1="48" x2="22" y2="48" stroke={TEAL} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <circle cx="18" cy="18" r="3" fill={TEAL} opacity="0.3" />
      {/* Main area */}
      <rect x="34" y="12" width="38" height="12" rx="4" stroke={TEAL} strokeWidth="2" opacity="0.5" />
      {/* Keyboard shortcut badge */}
      <rect x="40" y="34" width="26" height="16" rx="4" fill={TEAL} opacity="0.12" />
      <text x="53" y="45" textAnchor="middle" fill={TEAL} fontSize="9" fontWeight="bold" fontFamily="monospace">Cmd+K</text>
      {/* Dark mode toggle */}
      <circle cx="53" cy="62" r="8" stroke={TEAL} strokeWidth="2" opacity="0.5" />
      <path d="M53 56a6 6 0 000 12 4 4 0 100-12z" fill={TEAL} opacity="0.2" />
    </svg>
  )
}

function IconVisitas() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      {/* Clipboard */}
      <rect x="18" y="16" width="44" height="52" rx="4" stroke={TEAL} strokeWidth="2" />
      <rect x="30" y="10" width="20" height="12" rx="3" stroke={TEAL} strokeWidth="2" fill="white" />
      <circle cx="40" cy="16" r="2" fill={TEAL} />
      {/* Lines */}
      <line x1="26" y1="32" x2="54" y2="32" stroke={TEAL} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="26" y1="40" x2="48" y2="40" stroke={TEAL} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="26" y1="48" x2="50" y2="48" stroke={TEAL} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      {/* Check */}
      <circle cx="54" cy="56" r="8" fill={TEAL} opacity="0.15" />
      <path d="M50 56l3 3 6-6" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconProyectos() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      {/* Kanban columns */}
      <rect x="8" y="16" width="18" height="48" rx="4" stroke={TEAL} strokeWidth="2" opacity="0.5" />
      <rect x="31" y="16" width="18" height="48" rx="4" stroke={TEAL} strokeWidth="2" opacity="0.5" />
      <rect x="54" y="16" width="18" height="48" rx="4" stroke={TEAL} strokeWidth="2" opacity="0.5" />
      {/* Cards */}
      <rect x="11" y="22" width="12" height="10" rx="2" fill={TEAL} opacity="0.2" />
      <rect x="11" y="36" width="12" height="8" rx="2" fill={TEAL} opacity="0.12" />
      <rect x="34" y="22" width="12" height="14" rx="2" fill={TEAL} opacity="0.25" />
      <rect x="34" y="40" width="12" height="10" rx="2" fill={TEAL} opacity="0.15" />
      <rect x="57" y="22" width="12" height="8" rx="2" fill={TEAL} opacity="0.18" />
      {/* Progress bar */}
      <rect x="8" y="68" width="64" height="4" rx="2" fill={TEAL} opacity="0.1" />
      <rect x="8" y="68" width="42" height="4" rx="2" fill={TEAL} opacity="0.4" />
    </svg>
  )
}

function IconReady() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <circle cx="40" cy="40" r="30" stroke={TEAL} strokeWidth="2" />
      <circle cx="40" cy="40" r="22" fill={TEAL} opacity="0.1" />
      <path
        d="M30 40l7 7 14-14"
        stroke={TEAL}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Sparkles */}
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

// ─── Steps data ──────────────────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    title: "Bienvenido a InLab",
    description:
      "La plataforma interna de Palex Medical para la gestion de proyectos hospitalarios, visitas tecnicas y seguimiento de equipamiento. Todo tu trabajo en un solo lugar.",
    icon: <IconWelcome />,
  },
  {
    title: "Tu panel principal",
    description:
      "El Dashboard te muestra los KPIs mas importantes, el widget \"Mi Dia\" con tus tareas y visitas pendientes, y accesos rapidos a las secciones que mas usas.",
    icon: <IconDashboard />,
  },
  {
    title: "Explora la plataforma",
    description:
      "Usa la barra lateral para navegar entre secciones. Pulsa Cmd+K (o Ctrl+K) para abrir la busqueda rapida. Cambia entre modo claro y oscuro desde la barra superior.",
    icon: <IconNavigation />,
  },
  {
    title: "Gestion de visitas",
    description:
      "Crea visitas tecnicas a hospitales, registra informacion en el formulario de 13 secciones, adjunta fotos, genera PDFs profesionales y trabaja sin conexion.",
    icon: <IconVisitas />,
  },
  {
    title: "Seguimiento de proyectos",
    description:
      "Gestiona proyectos con 10 tabs especializadas: cockpit, fases, tareas, timeline, materiales y mas. Usa la vista Kanban para organizar el trabajo visualmente.",
    icon: <IconProyectos />,
  },
  {
    title: "Todo listo",
    description:
      "Ya conoces lo esencial. Explora la plataforma a tu ritmo — cada seccion tiene filtros, busqueda y atajos para que trabajes de forma eficiente.",
    icon: <IconReady />,
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<"next" | "prev">("next")
  const [animating, setAnimating] = useState(false)
  const [saving, setSaving] = useState(false)

  // Check onboarding status on mount
  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const r = await fetch("/api/onboarding")
        if (!r.ok) { setLoading(false); return }
        const d = await r.json() as { completado?: boolean }
        if (!cancelled && d.completado === false) {
          setVisible(true)
        }
      } catch {
        // fail silently — don't block the app
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void check()
    return () => { cancelled = true }
  }, [])

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
    if (step === STEPS.length - 1) return
    setDirection("next")
    setAnimating(true)
    setTimeout(() => {
      setStep(s => s + 1)
      setAnimating(false)
    }, 200)
  }, [step, animating])

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

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        if (step < STEPS.length - 1) goNext()
      }
      if (e.key === "ArrowLeft") goPrev()
      if (e.key === "Escape") void markCompleted()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [visible, step, goNext, goPrev, markCompleted])

  if (loading || !visible) return null

  const isFirst = step === 0
  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative"
        role="dialog"
        aria-modal="true"
        aria-label="Onboarding"
      >
        {/* Skip link */}
        <button
          onClick={() => void markCompleted()}
          className="absolute top-4 right-4 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
          disabled={saving}
        >
          Saltar
        </button>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-6 pb-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? 24 : 8,
                height: 8,
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

        {/* Step content */}
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
          {/* Icon / Logo */}
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

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            {current.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm">
            {current.description}
          </p>
        </div>

        {/* Step counter */}
        <div className="text-center pb-2">
          <span className="text-xs text-gray-300 dark:text-gray-600 font-medium">
            {step + 1} / {STEPS.length}
          </span>
        </div>

        {/* Navigation buttons */}
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
