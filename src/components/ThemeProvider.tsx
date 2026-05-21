"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

interface ThemeCtx {
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}

const Ctx = createContext<ThemeCtx>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light")

  useEffect(() => {
    const stored = localStorage.getItem("palex_theme") as Theme | null
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    applyTheme(stored ?? preferred)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyTheme(t: Theme) {
    setThemeState(t)
    const html = document.documentElement
    // Suave transición al cambiar tema
    html.classList.add("theme-transitioning")
    setTimeout(() => html.classList.remove("theme-transitioning"), 350)
    html.classList.toggle("dark", t === "dark")
  }

  function setTheme(t: Theme) {
    localStorage.setItem("palex_theme", t)
    applyTheme(t)
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <Ctx.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </Ctx.Provider>
  )
}

export function useTheme() {
  return useContext(Ctx)
}
