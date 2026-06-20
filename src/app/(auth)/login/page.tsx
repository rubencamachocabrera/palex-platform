"use client"

import { useState, useRef } from "react"
import { signIn } from "next-auth/react"
import Image from "next/image"
import { TEAL, ORANGE, ORANGE_DARK } from "@/lib/brand"

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
      {/* ── Overlay post-login ─────────────────────────────────────────────── */}
      {redirecting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white">
          <Image src="/logo-palex.png" alt="Palex Medical" width={120} height={44} priority
            style={{ opacity: 0.55 }} />
          <div className="flex items-center gap-2">
            {[0, 160, 320].map((delay, i) => (
              <span key={i} className="w-2 h-2 rounded-full animate-bounce"
                style={{
                  backgroundColor: i === 1 ? ORANGE : TEAL,
                  animationDelay: `${delay}ms`,
                }} />
            ))}
          </div>
          <p className="text-xs tracking-[0.3em] uppercase font-semibold"
            style={{ color: "#64748b" }}>
            Accediendo al sistema
          </p>
        </div>
      )}

      {/* ── Formulario ─────────────────────────────────────────────────────── */}
      <div ref={cardRef}
        className={`w-full max-w-[380px] ${shaking ? "login-shake" : ""}`}>

        {/* Logo — solo móvil */}
        <div className="flex justify-center mb-10 lg:hidden">
          <Image src="/logo-palex.png" alt="Palex Medical" width={110} height={38} priority />
        </div>

        {/* Encabezado */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: ORANGE }} />
            <span className="text-[10px] font-bold tracking-[0.28em] uppercase"
              style={{ color: "#b45309" }}>
              Acceso privado
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Iniciar sesión
          </h2>
          <p className="text-sm mt-1.5 text-gray-500 font-medium">
            Introduce tus credenciales para continuar
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          {/* Email */}
          <div>
            <label htmlFor="login-email"
              className="block text-[10px] font-bold tracking-[0.22em] uppercase mb-2 text-gray-500">
              Correo electrónico
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                placeholder="usuario@palex.com"
                className="w-full py-3.5 pl-10 pr-4 rounded-xl text-sm text-gray-900 outline-none transition-all duration-200"
                style={{
                  background: "#f8fafc",
                  border: "1.5px solid #e2e8f0",
                } as React.CSSProperties}
                onFocus={e => {
                  e.currentTarget.style.borderColor = TEAL
                  e.currentTarget.style.background  = "#ffffff"
                  e.currentTarget.style.boxShadow   = `0 0 0 3px ${TEAL}20`
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = "#e2e8f0"
                  e.currentTarget.style.background  = "#f8fafc"
                  e.currentTarget.style.boxShadow   = "none"
                }}
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label htmlFor="login-password"
              className="block text-[10px] font-bold tracking-[0.22em] uppercase mb-2 text-gray-500">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full py-3.5 pl-10 pr-12 rounded-xl text-sm text-gray-900 outline-none transition-all duration-200"
                style={{
                  background: "#f8fafc",
                  border: "1.5px solid #e2e8f0",
                } as React.CSSProperties}
                onFocus={e => {
                  e.currentTarget.style.borderColor = TEAL
                  e.currentTarget.style.background  = "#ffffff"
                  e.currentTarget.style.boxShadow   = `0 0 0 3px ${TEAL}20`
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = "#e2e8f0"
                  e.currentTarget.style.background  = "#f8fafc"
                  e.currentTarget.style.boxShadow   = "none"
                }}
              />
              <button type="button"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-1 top-1/2 -translate-y-1/2 cursor-pointer transition-colors duration-150 text-gray-400 flex items-center justify-center w-11 h-11 rounded-lg"
                onMouseEnter={e => (e.currentTarget.style.color = TEAL)}
                onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}>
                {showPassword ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div role="alert" aria-live="assertive"
              className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium"
              style={{
                background: "#fff1f2",
                border: "1.5px solid #fecdd3",
                color: "#e11d48",
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Botón */}
          <div className="pt-1">
            <button type="submit"
              disabled={loading || redirecting}
              className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: "#b45309",
                color: "white",
                boxShadow: `0 4px 18px ${ORANGE}45`,
              }}
              onMouseEnter={e => {
                if (!loading && !redirecting) {
                  e.currentTarget.style.backgroundColor = "#92400e"
                  e.currentTarget.style.boxShadow       = `0 6px 24px ${ORANGE}60`
                  e.currentTarget.style.transform        = "translateY(-1px)"
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = "#b45309"
                e.currentTarget.style.boxShadow       = `0 4px 18px ${ORANGE}45`
                e.currentTarget.style.transform        = "translateY(0)"
              }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Verificando…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Entrar al sistema
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-10 flex items-center justify-between">
          <p className="text-[10px] tracking-widest uppercase font-medium text-gray-500">
            © {new Date().getFullYear()} Palex Medical
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TEAL,   opacity: 0.5 }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ORANGE, opacity: 0.5 }} />
          </div>
        </div>
      </div>

      <style>{`
        #login-email::placeholder,
        #login-password::placeholder { color: #cbd5e1; }
        .login-shake {
          animation: loginShake 0.55s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes loginShake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-5px); }
          40%, 60%       { transform: translateX(5px); }
        }
      `}</style>
    </>
  )
}
