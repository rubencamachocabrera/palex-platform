"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { TEAL } from "@/lib/brand"

interface Usuario {
  id: string
  nombre: string
  rol: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

const ROL_COLORS: Record<string, { bg: string; text: string }> = {
  ADMIN: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" },
  VENTAS: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300" },
  PROYECTOS: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
  TECNICO: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300" },
}

export function MentionInput({ value, onChange, placeholder, className, onKeyDown }: Props) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [query, setQuery] = useState("")
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [mentionStart, setMentionStart] = useState(-1)
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch users matching query
  const fetchUsuarios = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/usuarios/menciones?q=${encodeURIComponent(q)}`)
      if (r.ok) {
        const data = await r.json()
        setUsuarios(Array.isArray(data) ? data.slice(0, 5) : [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  // Debounced fetch
  useEffect(() => {
    if (!showDropdown) return
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
    fetchTimeoutRef.current = setTimeout(() => fetchUsuarios(query), 200)
    return () => { if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current) }
  }, [query, showDropdown, fetchUsuarios])

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newVal = e.target.value
    onChange(newVal)

    const cursorPos = e.target.selectionStart
    // Check if we're in a mention context
    const textBefore = newVal.slice(0, cursorPos)
    const atIdx = textBefore.lastIndexOf("@")

    if (atIdx >= 0) {
      const charBefore = atIdx > 0 ? textBefore[atIdx - 1] : " "
      const textAfterAt = textBefore.slice(atIdx + 1)
      // Only trigger if @ is at start or preceded by whitespace, and no space in the query (simple heuristic)
      if ((charBefore === " " || charBefore === "\n" || atIdx === 0) && !textAfterAt.includes("\n") && textAfterAt.length <= 30) {
        setMentionStart(atIdx)
        setQuery(textAfterAt)
        setShowDropdown(true)
        setSelectedIdx(0)
        return
      }
    }
    setShowDropdown(false)
  }

  function insertMention(user: Usuario) {
    if (mentionStart < 0) return
    const before = value.slice(0, mentionStart)
    const afterCursor = textareaRef.current ? value.slice(textareaRef.current.selectionStart) : ""
    const mention = `@[${user.id}:${user.nombre}] `
    const newValue = before + mention + afterCursor
    onChange(newValue)
    setShowDropdown(false)
    setQuery("")
    setMentionStart(-1)

    // Set cursor after mention
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const pos = before.length + mention.length
        textareaRef.current.selectionStart = pos
        textareaRef.current.selectionEnd = pos
        textareaRef.current.focus()
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showDropdown && usuarios.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIdx(i => (i + 1) % usuarios.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIdx(i => (i - 1 + usuarios.length) % usuarios.length)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        insertMention(usuarios[selectedIdx])
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setShowDropdown(false)
        return
      }
    }
    // Pass through to parent handler if not consumed
    onKeyDown?.(e)
  }

  // Close dropdown on blur (with delay for click handling)
  function handleBlur() {
    setTimeout(() => setShowDropdown(false), 200)
  }

  // Compute dropdown position relative to textarea
  const dropdownStyle: React.CSSProperties = {
    bottom: "100%",
    left: 0,
    marginBottom: 4,
  }

  return (
    <div className="relative flex-1">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={1}
        className={className || "w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent resize-none min-h-[38px] max-h-24"}
        style={{ lineHeight: "1.45" }}
      />

      {/* Mention dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="absolute z-50 w-72 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          {loading ? (
            <div className="px-4 py-3 text-xs text-gray-400 text-center">Buscando...</div>
          ) : usuarios.length === 0 ? (
            <div className="px-4 py-3 text-xs text-gray-400 text-center">
              {query.length > 0 ? "Sin resultados" : "Escribe un nombre..."}
            </div>
          ) : (
            <div className="py-1">
              {usuarios.map((u, i) => {
                const rolStyle = ROL_COLORS[u.rol] ?? ROL_COLORS.TECNICO
                return (
                  <button
                    key={u.id}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); insertMention(u) }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                      i === selectedIdx
                        ? "bg-teal-50 dark:bg-teal-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    {/* Avatar initial */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: TEAL }}
                    >
                      {u.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate block">{u.nombre}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${rolStyle.bg} ${rolStyle.text}`}>
                      {u.rol}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Extract mentioned user IDs from text containing @[userId:Nombre] patterns.
 */
export function extractMentionIds(text: string): string[] {
  const ids: string[] = []
  const regex = /@\[([^:]+):([^\]]+)\]/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    ids.push(match[1])
  }
  return [...new Set(ids)]
}
