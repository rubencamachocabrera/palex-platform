"use client"

import { useState, useRef } from "react"
import { signIn } from "next-auth/react"
import Image from "next/image"
import { TEAL, ORANGE } from "@/lib/brand"

export default function LoginPage() {
  const [error, setError]               = useState("")
  const [loading, setLoading]           = useState(false)
  const [redirecting, setRedirecting]   = useState(false)
  const [shaking, setShaking]           = useState(false)
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
        <div className="login-overlay fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
          style={{ background: "#05111d" }}>
          <Image src="/logo-palex.png" alt="Palex Medical" width={140} height={52} priority
            style={{ filter: "brightness(0) invert(1)", opacity: 0.6 }} />
          <div className="flex items-center gap-2">
            {[0, 150, 300].map((delay, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ backgroundColor: TEAL, animationDelay: `${delay}ms` }} />
            ))}
          </div>
          <p className="text-[10px] tracking-[0.3em] uppercase"
            style={{ color: "rgba(255,255,255,0.25)" }}>Accediendo al sistema</p>
        </div>
      )}

      {/* ── Formulario ── */}
      <div ref={cardRef} className={`w-full max-w-[360px] ${shaking ? "login-shake" : ""}`}>

        {/* Logo — solo mobile */}
        <div className="flex justify-center mb-10 lg:hidden">
          <Image src="/logo-palex.png" alt="Palex Medical" width={120} height={42} priority
            style={{ filter: "brightness(0) invert(1)", opacity: 0.7 }} />
        </div>

        {/* Encabezado */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-4 h-px" style={{ backgroundColor: ORANGE }} />
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase"
              style={{ color: ORANGE, opacity: 0.9 }}>
              Acceso privado
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: "rgba(255,255,255,0.88)" }}>
            Iniciar sesión
          </h2>
          <p className="text-sm mt-1.5" style={{ color: "rgba(255,255,255,0.32)" }}>
            Introduce tus credenciales para continuar
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>

          {/* Email */}
          <div>
            <label htmlFor="login-email"
              className="block text-[10px] font-bold tracking-[0.2em] uppercase mb-2.5"
              style={{ color: "rgba(255,255,255,0.4)" }}>
              Correo electrónico
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              placeholder="usuario@palex.com"
              className="w-full py-3.5 px-4 rounded-xl text-sm outline-none transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.85)",
              } as React.CSSProperties}
              onFocus={e => {
                e.currentTarget.style.borderColor = TEAL + "70"
                e.currentTarget.style.background = "rgba(0,169,157,0.06)"
                e.currentTarget.style.boxShadow = `0 0 0 3px ${TEAL}14`
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"
                e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                e.currentTarget.style.boxShadow = "none"
              }}
            />
          </div>

          {/* Contraseña */}
          <div>
            <label htmlFor="login-password"
              className="block text-[10px] font-bold tracking-[0.2em] uppercase mb-2.5"
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
                className="w-full py-3.5 px-4 pr-12 rounded-xl text-sm outline-none transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.85)",
                } as React.CSSProperties}
                onFocus={e => {
                  e.currentTarget.style.borderColor = TEAL + "70"
                  e.currentTarget.style.background = "rgba(0,169,157,0.06)"
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${TEAL}14`
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                  e.currentTarget.style.boxShadow = "none"
                }}
              />
              <button type="button"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer transition-colors duration-150"
                style={{ color: "rgba(255,255,255,0.28)" }}
                onMouseEnter={e => (e.currentTarget.style.color = TEAL)}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}>
                {showPassword ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm"
              style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)", color: "#fca5a5" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Botón */}
          <div className="pt-1">
            <button type="submit"
              disabled={loading || redirecting}
              className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 cursor-pointer disabled:opacity-50 relative overflow-hidden"
              style={{
                backgroundColor: TEAL,
                color: "white",
                boxShadow: loading || redirecting ? "none" : `0 0 0 0 ${TEAL}`,
              }}
              onMouseEnter={e => { if (!loading && !redirecting) { e.currentTarget.style.boxShadow = `0 4px 24px ${TEAL}45, 0 0 0 1px ${TEAL}` } }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none" }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Verificando…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Entrar
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-10 flex items-center justify-between">
          <p className="text-[10px] tracking-widest uppercase"
            style={{ color: "rgba(255,255,255,0.16)" }}>
            © {new Date().getFullYear()} Palex Medical
          </p>
          <div className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: TEAL, opacity: 0.5 }} />
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: ORANGE, opacity: 0.5 }} />
          </div>
        </div>
      </div>

      {/* Placeholder color para inputs */}
      <style>{`
        #login-email::placeholder,
        #login-password::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </>
  )
}
