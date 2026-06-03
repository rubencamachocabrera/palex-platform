"use client"

import { useState, useRef } from "react"
import { signIn } from "next-auth/react"
import Image from "next/image"
import { TEAL, ORANGE } from "@/lib/brand"

const BG = "#030d18"

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
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7"
          style={{ background: BG }}>
          {/* Glow behind logo */}
          <div className="relative">
            <div className="absolute inset-0 pointer-events-none" style={{
              background: `radial-gradient(circle, ${TEAL}25 0%, transparent 70%)`,
              filter: "blur(28px)",
              transform: "scale(2)",
            }} />
            <Image src="/logo-palex.png" alt="Palex Medical" width={128} height={46} priority
              style={{ filter: "brightness(0) invert(1)", opacity: 0.52, position: "relative" }} />
          </div>
          <div className="flex items-center gap-2.5">
            {[0, 180, 360].map((delay, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{
                  backgroundColor: i === 1 ? ORANGE : TEAL,
                  animationDelay: `${delay}ms`,
                  boxShadow: `0 0 8px ${i === 1 ? ORANGE : TEAL}90`,
                }} />
            ))}
          </div>
          <p className="text-[9px] tracking-[0.4em] uppercase"
            style={{
              color: "rgba(255,255,255,0.20)",
              fontFamily: "var(--font-geist-mono, monospace)",
            }}>
            AUTENTICANDO...
          </p>
        </div>
      )}

      {/* ── Form wrapper ───────────────────────────────────────────────────── */}
      <div ref={cardRef}
        className={`w-full max-w-[375px] relative ${shaking ? "login-shake" : ""}`}>

        {/* HUD corner brackets — outside the card */}
        <div className="absolute -top-2.5 -left-2.5 w-6 h-6 pointer-events-none"
          style={{ borderTop: `1.5px solid ${TEAL}85`, borderLeft: `1.5px solid ${TEAL}85` }} />
        <div className="absolute -top-2.5 -right-2.5 w-6 h-6 pointer-events-none"
          style={{ borderTop: `1.5px solid ${ORANGE}65`, borderRight: `1.5px solid ${ORANGE}65` }} />
        <div className="absolute -bottom-2.5 -left-2.5 w-6 h-6 pointer-events-none"
          style={{ borderBottom: `1.5px solid ${TEAL}65`, borderLeft: `1.5px solid ${TEAL}65` }} />
        <div className="absolute -bottom-2.5 -right-2.5 w-6 h-6 pointer-events-none"
          style={{ borderBottom: `1.5px solid ${ORANGE}50`, borderRight: `1.5px solid ${ORANGE}50` }} />

        {/* Glassmorphic card */}
        <div className="rounded-2xl px-8 py-9 relative overflow-hidden"
          style={{
            background: `linear-gradient(138deg, rgba(0,169,157,0.06) 0%, rgba(0,0,0,0.28) 60%, rgba(5,16,32,0.55) 100%)`,
            border: `1px solid rgba(0,169,157,0.20)`,
            boxShadow: `
              0 0 40px rgba(0,169,157,0.08),
              0 0 80px rgba(0,169,157,0.04),
              0 24px 64px rgba(0,0,0,0.45),
              inset 0 1px 0 rgba(255,255,255,0.045)
            `,
            backdropFilter: "blur(24px)",
          }}>

          {/* Top shimmer line */}
          <div className="absolute top-0 left-12 right-12 h-px pointer-events-none"
            style={{ background: `linear-gradient(90deg, transparent, ${TEAL}55, transparent)` }} />

          {/* Inner ambient glow */}
          <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none" style={{
            background: `radial-gradient(ellipse at 50% 0%, ${TEAL}0A 0%, transparent 70%)`,
          }} />

          {/* Logo — mobile only */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Image src="/logo-palex.png" alt="Palex Medical" width={110} height={38} priority
              style={{ filter: "brightness(0) invert(1)", opacity: 0.62 }} />
          </div>

          {/* ── Header ── */}
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: TEAL,
                  boxShadow: `0 0 7px ${TEAL}`,
                }} />
              <span className="text-[9px] font-bold tracking-[0.38em] uppercase"
                style={{
                  color: ORANGE,
                  opacity: 0.88,
                  fontFamily: "var(--font-geist-mono, monospace)",
                }}>
                Acceso privado
              </span>
              <div className="flex-1 h-px ml-1"
                style={{ background: `linear-gradient(90deg, ${ORANGE}30, transparent)` }} />
            </div>

            <h2 className="text-[1.6rem] font-bold tracking-tight"
              style={{ color: "rgba(255,255,255,0.92)", letterSpacing: "-0.01em" }}>
              Iniciar sesión
            </h2>
            <p className="text-xs mt-1.5"
              style={{
                color: "rgba(255,255,255,0.28)",
                fontFamily: "var(--font-geist-mono, monospace)",
                letterSpacing: "0.03em",
              }}>
              Introduce tus credenciales para continuar
            </p>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Email */}
            <div>
              <label htmlFor="login-email"
                className="block text-[9px] font-bold tracking-[0.32em] uppercase mb-2.5"
                style={{
                  color: `${TEAL}CC`,
                  fontFamily: "var(--font-geist-mono, monospace)",
                }}>
                Correo electrónico
              </label>
              <div className="relative">
                {/* Icon */}
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: `${TEAL}60` }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
                  className="w-full py-3.5 pl-10 pr-4 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid rgba(0,169,157,0.16)`,
                    color: "rgba(255,255,255,0.84)",
                    fontSize: 13,
                    fontFamily: "var(--font-geist-mono, monospace)",
                  } as React.CSSProperties}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = `${TEAL}60`
                    e.currentTarget.style.background   = `rgba(0,169,157,0.07)`
                    e.currentTarget.style.boxShadow    = `0 0 0 3px ${TEAL}15, 0 0 18px ${TEAL}10`
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = `rgba(0,169,157,0.16)`
                    e.currentTarget.style.background   = "rgba(255,255,255,0.04)"
                    e.currentTarget.style.boxShadow    = "none"
                  }}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label htmlFor="login-password"
                className="block text-[9px] font-bold tracking-[0.32em] uppercase mb-2.5"
                style={{
                  color: `${TEAL}CC`,
                  fontFamily: "var(--font-geist-mono, monospace)",
                }}>
                Contraseña
              </label>
              <div className="relative">
                {/* Lock icon */}
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: `${TEAL}60` }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
                  className="w-full py-3.5 pl-10 pr-12 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid rgba(0,169,157,0.16)`,
                    color: "rgba(255,255,255,0.84)",
                    fontSize: 13,
                    fontFamily: "var(--font-geist-mono, monospace)",
                  } as React.CSSProperties}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = `${TEAL}60`
                    e.currentTarget.style.background   = `rgba(0,169,157,0.07)`
                    e.currentTarget.style.boxShadow    = `0 0 0 3px ${TEAL}15, 0 0 18px ${TEAL}10`
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = `rgba(0,169,157,0.16)`
                    e.currentTarget.style.background   = "rgba(255,255,255,0.04)"
                    e.currentTarget.style.boxShadow    = "none"
                  }}
                />
                {/* Toggle visibility */}
                <button type="button"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer transition-colors duration-150"
                  style={{ color: "rgba(255,255,255,0.26)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = TEAL)}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.26)")}>
                  {showPassword ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
                className="flex items-center gap-2.5 rounded-xl px-4 py-3"
                style={{
                  background: "rgba(220,38,38,0.08)",
                  border: "1px solid rgba(220,38,38,0.22)",
                  color: "#fca5a5",
                  fontSize: 12,
                  fontFamily: "var(--font-geist-mono, monospace)",
                }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || redirecting}
                className="w-full py-3.5 rounded-xl font-bold transition-all duration-200 cursor-pointer disabled:opacity-40 relative overflow-hidden"
                style={{
                  background: `linear-gradient(90deg, ${ORANGE} 0%, ${ORANGE}E0 100%)`,
                  color: "white",
                  letterSpacing: "0.22em",
                  fontSize: 11,
                  fontFamily: "var(--font-geist-mono, monospace)",
                  textTransform: "uppercase",
                  boxShadow: loading || redirecting
                    ? "none"
                    : `0 0 22px ${ORANGE}45, 0 4px 18px ${ORANGE}35`,
                }}
                onMouseEnter={e => {
                  if (!loading && !redirecting) {
                    e.currentTarget.style.background  = `linear-gradient(90deg, ${ORANGE}F0 0%, ${TEAL} 100%)`
                    e.currentTarget.style.boxShadow   = `0 0 32px ${ORANGE}65, 0 4px 28px ${TEAL}40`
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background  = `linear-gradient(90deg, ${ORANGE} 0%, ${ORANGE}E0 100%)`
                  e.currentTarget.style.boxShadow   = `0 0 22px ${ORANGE}45, 0 4px 18px ${ORANGE}35`
                }}>

                {/* Shimmer overlay */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.09) 50%, transparent 100%)",
                }} />

                {loading ? (
                  <span className="flex items-center justify-center gap-2 relative">
                    <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Verificando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2 relative">
                    Entrar al sistema
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* ── Footer ── */}
          <div className="mt-8 pt-5 flex items-center justify-between"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[9px] tracking-widest uppercase"
              style={{
                color: "rgba(255,255,255,0.14)",
                fontFamily: "var(--font-geist-mono, monospace)",
              }}>
              © {new Date().getFullYear()} Palex Medical
            </p>
            <div className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full"    style={{ backgroundColor: TEAL,   opacity: 0.50 }} />
              <span className="w-1 h-1 rounded-full"    style={{ backgroundColor: ORANGE, opacity: 0.50 }} />
              <span className="w-2.5 h-1 rounded-full"  style={{ backgroundColor: ORANGE, opacity: 0.22 }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Styles ─────────────────────────────────────────────────────────── */}
      <style>{`
        #login-email::placeholder,
        #login-password::placeholder {
          color: rgba(255,255,255,0.18);
          font-family: var(--font-geist-mono, monospace);
        }
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
