"use client"

import { useState, useRef } from "react"
import { signIn } from "next-auth/react"
import Image from "next/image"
import { TEAL } from "@/lib/brand"

export default function LoginPage() {
  const [error, setError]         = useState("")
  const [loading, setLoading]     = useState(false)
  const [redirecting, setRedirecting] = useState(false)   // overlay branded post-login
  const [shaking, setShaking]     = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Activa el shake y lo retira tras la animación
  function triggerShake() {
    setShaking(false)
    // Forzar un reflow para que la animación se relance si ya estaba activa
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setShaking(true))
    })
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
      setError("Email o contraseña incorrectos")
      triggerShake()
      return
    }

    // ── Login correcto: mostrar overlay de carga antes de navegar ──
    // Hard redirect para que el servidor lea la cookie nueva y no sirva
    // layout cacheado del App Router con el rol del usuario anterior.
    setRedirecting(true)
    window.location.href = "/dashboard"
  }

  const inputClass =
    "w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 text-sm bg-white " +
    "focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition placeholder-gray-300"

  return (
    <>
      {/* ── Overlay de carga branded (aparece tras login correcto) ── */}
      {redirecting && (
        <div className="login-overlay fixed inset-0 z-50 flex flex-col items-center justify-center bg-white gap-5">
          <div className="login-overlay-logo">
            <Image src="/logo-palex.png" alt="Palex Medical" width={160} height={60} priority />
          </div>
          {/* Tres puntos con bounce escalonado */}
          <div className="flex items-center gap-2 mt-1">
            {[0, 150, 300].map((delay, i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ backgroundColor: TEAL, animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
          <p className="text-xs text-gray-300 mt-1">Accediendo al sistema…</p>
        </div>
      )}

      {/* ── Card del formulario ── */}
      <div
        ref={cardRef}
        className={`w-full max-w-sm ${shaking ? "login-shake" : ""}`}
      >
        {/* Logo solo en móvil */}
        <div className="flex justify-center mb-8 lg:hidden">
          <Image src="/logo-palex.png" alt="Palex Medical" width={160} height={60} priority />
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido de nuevo</h1>
          <p className="text-sm text-gray-400 mt-1">Accede a tu cuenta para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>

          {/* Email */}
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              className={inputClass}
              placeholder="tu@palex.com"
            />
          </div>

          {/* Contraseña */}
          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                className={inputClass + " pr-11"}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div role="alert" aria-live="assertive" className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl animate-in fade-in duration-150">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={loading || redirecting}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 mt-2 shadow-sm"
            style={{ backgroundColor: TEAL }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Verificando…
              </span>
            ) : "Iniciar sesión"}
          </button>

        </form>

        <p className="text-center text-xs text-gray-300 mt-8">
          Palex Medical © {new Date().getFullYear()}
        </p>
      </div>
    </>
  )
}
