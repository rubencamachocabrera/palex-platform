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
  ADMIN:     { bg: "bg-red-100 dark:bg-red-900/30",    text: "text-red-700 dark:text-red-300" },
  VENTAS:    { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300" },
  PROYECTOS: { bg: "bg-blue-100 dark:bg-blue-900/30",  text: "text-blue-700 dark:text-blue-300" },
  TECNICO:   { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300" },
}

// @[id:nombre] → @nombre  (for textarea display)
function rawToDisplay(raw: string): string {
  return raw.replace(/@\[([^:]+):([^\]]+)\]/g, "@$2")
}

// @nombre → @[id:nombre]  using the accumulated mentionMap
function buildRaw(display: string, map: Record<string, string>): string {
  let raw = display
  for (const [nombre, id] of Object.entries(map)) {
    raw = raw.split(`@${nombre}`).join(`@[${id}:${nombre}]`)
  }
  return raw
}

// Seed mentionMap from an existing raw value (e.g. when editing a saved note)
function seedMap(raw: string): Record<string, string> {
  const map: Record<string, string> = {}
  let m: RegExpExecArray | null
  const re = /@\[([^:]+):([^\]]+)\]/g
  while ((m = re.exec(raw)) !== null) map[m[2]] = m[1]
  return map
}

export function MentionInput({ value, onChange, placeholder, className, onKeyDown }: Props) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [query, setQuery] = useState("")
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [mentionStart, setMentionStart] = useState(-1)
  const [loading, setLoading] = useState(false)

  // displayVal is what the textarea shows (@Nombre, no brackets)
  // mentionMap tracks nombre→id for all inserted mentions
  const [displayVal, setDisplayVal] = useState(() => rawToDisplay(value))
  const [mentionMap, setMentionMap] = useState<Record<string, string>>(() => seedMap(value))

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync when parent clears the field or loads a new external value (edit modal)
  useEffect(() => {
    if (!value) {
      setDisplayVal("")
      setMentionMap({})
    } else if (rawToDisplay(value) !== value) {
      // Value from parent contains @[id:nombre] tokens → came from DB, resync display
      setDisplayVal(rawToDisplay(value))
      setMentionMap(seedMap(value))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const fetchU = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/usuarios/menciones?q=${encodeURIComponent(q)}`)
      if (r.ok) {
        const d = await r.json()
        setUsuarios(Array.isArray(d) ? d.slice(0, 5) : [])
      }
    } catch { /**/ }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!showDropdown) return
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
    fetchTimeoutRef.current = setTimeout(() => fetchU(query), 180)
    return () => { if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current) }
  }, [query, showDropdown, fetchU])

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newDisplay = e.target.value
    setDisplayVal(newDisplay)

    // Prune mentions that were deleted by the user
    const newMap = { ...mentionMap }
    let changed = false
    for (const nombre of Object.keys(newMap)) {
      if (!newDisplay.includes(`@${nombre}`)) {
        delete newMap[nombre]
        changed = true
      }
    }
    const map = changed ? newMap : mentionMap
    if (changed) setMentionMap(newMap)

    // Propagate raw value to parent
    onChange(buildRaw(newDisplay, map))

    // Detect @ trigger for dropdown
    const cursorPos = e.target.selectionStart
    const textBefore = newDisplay.slice(0, cursorPos)
    const atIdx = textBefore.lastIndexOf("@")

    if (atIdx >= 0) {
      const charBefore = atIdx > 0 ? textBefore[atIdx - 1] : " "
      const textAfterAt = textBefore.slice(atIdx + 1)
      const isNewAt =
        (charBefore === " " || charBefore === "\n" || atIdx === 0) &&
        !textAfterAt.includes("\n") &&
        textAfterAt.length <= 30 &&
        // Don't re-trigger if cursor is inside an existing resolved mention
        !Object.keys(map).some(n => textAfterAt.startsWith(n))

      if (isNewAt) {
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
    const selStart = textareaRef.current?.selectionStart ?? displayVal.length
    const before = displayVal.slice(0, mentionStart)
    const afterCursor = displayVal.slice(selStart)

    const displayMention = `@${user.nombre} `
    const newDisplay = before + displayMention + afterCursor
    setDisplayVal(newDisplay)

    const newMap = { ...mentionMap, [user.nombre]: user.id }
    setMentionMap(newMap)
    onChange(buildRaw(newDisplay, newMap))

    setShowDropdown(false)
    setQuery("")
    setMentionStart(-1)

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const pos = before.length + displayMention.length
        textareaRef.current.selectionStart = pos
        textareaRef.current.selectionEnd = pos
        textareaRef.current.focus()
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showDropdown && usuarios.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => (i + 1) % usuarios.length); return }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelectedIdx(i => (i - 1 + usuarios.length) % usuarios.length); return }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(usuarios[selectedIdx]); return }
      if (e.key === "Escape")    { e.preventDefault(); setShowDropdown(false); return }
    }
    onKeyDown?.(e)
  }

  function handleBlur() {
    setTimeout(() => setShowDropdown(false), 200)
  }

  return (
    <div className="relative flex-1">
      <textarea
        ref={textareaRef}
        value={displayVal}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={1}
        className={
          className ||
          "w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent resize-none min-h-[38px] max-h-24"
        }
        style={{ lineHeight: "1.45" }}
      />

      {/* Dropdown — always below the textarea */}
      {showDropdown && (
        <div
          style={{ top: "100%", left: 0, marginTop: 4 }}
          className="absolute z-50 w-72 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden"
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
                      i === selectedIdx ? "bg-teal-50 dark:bg-teal-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
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
  while ((match = regex.exec(text)) !== null) ids.push(match[1])
  return [...new Set(ids)]
}
