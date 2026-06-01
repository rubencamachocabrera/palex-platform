"use client"

import { useState, useRef } from "react"
import { signIn } from "next-auth/react"
import Image from "next/image"
import { TEAL, ORANGE } from "@/lib/brand"

export default function LoginPage() {
  const [error, setError]             = useState("")
  const [loading, setLoading]         = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [shaking, setShaking]         = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  function triggerShake() {
    setShaking(false)
    requestAnimationFrame(() => { requestAnimationFrame(() => setShaking(true)) })
    setTimeout(() => setShaking(false), 600)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await signIn("credentials", {
      email:    formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    })
    if (result?.error) {
      setLoading(false)
      setError("Credenciales incorrectas")
      triggerShake()
      return
    }
    setRedirecting(true)
    window.location.href = "/dashboard"
  }

  return (
    <>
      {/* ── Overlay post-login ── */}
      {redirecting && (
        <div className="login-overlay fixed inset-0 z-50 flex flex-col items-center justify-center gap-5"
          style={{ background: "#060d18" }}>
          <div className="login-overlay-logo">
            <Image src="/logo-palex.png" alt="Palex Medical" width={140} height={52} priority />
          </div>
          <div className="flex items-center gap-2 mt-2">
            {[0, 160, 320].map((delay, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ backgroundColor: TEAL, animationDelay: `${delay}ms` }} />
            ))}
          </div>
          <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>
            Accediendo al sistema
          </p>
        </div>
      )}

      {/* ── Card glassmorphism ── */}
      <div ref={cardRef}
        className={`w-full max-w-sm relative ${shaking ? "login-shake" : ""}`}>

        {/* Glow detrás de la card */}
        <div className="absolute -inset-6 rounded-3xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,169,157,0.08), transparent)" }} />

        {/* Logo — solo en mobile */}
        <div className="flex justify-center mb-8 lg:hidden">
          <Image src="/logo-palex.png" alt="Palex Medical" width={130} height={46} priority />
        </div>

        {/* Card */}
        <div className="relative rounded-2xl p-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}>

          {/* Línea decorativa superior */}
          <div className="absolute top-0 left-8 right-8 h-px rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(0,169,157,0.5), transparent)" }} />

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: TEAL }} />
              <span className="text-[10px] tracking-[0.2em] uppercase font-semibold"
                style={{ color: "rgba(0,169,157,0.7)" }}>Sistema activo</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "rgba(255,255,255,0.92)" }}>
              Bienvenido de nuevo
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              Accede con tus credenciales Palex
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Email */}
            <div>
              <label htmlFor="login-email"
                className="block text-[11px] font-bold tracking-widest uppercase mb-2"
                style={{ color: "rgba(255,255,255,0.4)" }}>
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                placeholder="tu@palex.com"
                className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.85)",
                  "--placeholder-color": "rgba(255,255,255,0.2)",
                } as React.CSSProperties}
                onFocus={e => { e.currentTarget.style.borderColor = `${TEAL}80`; e.currentTarget.style.background = "rgba(0,169,157,0.05)" }}
                onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}
              />
            </div>

            {/* Contraseña */}
            <div>
              <label htmlFor="login-password"
                className="block text-[11px] font-bold tracking-widest uppercase mb-2"
                style={{ color: "rgba(255,255,255,0.4)" }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-xl text-sm transition-all duration-200 outline-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.85)",
                  } as React.CSSProperties}
                  onFocus={e => { e.currentTarget.style.borderColor = `${TEAL}80`; e.currentTarget.style.background = "rgba(0,169,157,0.05)" }}
                  onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}
                />
                <button type="button"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-150 cursor-pointer"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div role="alert" aria-live="assertive"
                className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm"
                style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.25)", color: "#fca5a5" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Botón */}
            <button type="submit"
              disabled={loading || redirecting}
              className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide mt-2 transition-all duration-200 cursor-pointer disabled:opacity-50 relative overflow-hidden"
              style={{
                background: loading || redirecting
                  ? "rgba(0,169,157,0.4)"
                  : `linear-gradient(135deg, ${TEAL} 0%, #00c4b7 100%)`,
                color: "white",
                boxShadow: loading || redirecting ? "none" : `0 4px 20px rgba(0,169,157,0.35)`,
              }}>
              {/* Shine effect */}
              {!loading && !redirecting && (
                <span className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300"
                  style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)" }} />
              )}
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Verificando…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Iniciar sesión
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </span>
              )}
            </button>
          </form>

          {/* Footer dentro de la card */}
          <div className="mt-7 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.18)" }}>
                Palex Medical © {new Date().getFullYear()}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: ORANGE, opacity: 0.6 }} />
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: TEAL, opacity: 0.6 }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder color para inputs en dark mode */}
      <style>{`
        #login-email::placeholder,
        #login-password::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </>
  )
}
