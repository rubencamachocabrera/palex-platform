"use client"

import { useState } from "react"
import { IconStar, IconCheck } from "@/components/ui/Icons"
import type { FormField } from "@/lib/form-schema"

// ─── Radio pills ───────────────────────────────────────────────────────────────
function RadioPills({ field, value, onChange, onBlur, readOnly }: {
  field: FormField; value: unknown; onChange: (v: unknown) => void
  onBlur?: () => void; readOnly: boolean
}) {
  return (
    <div id={field.id} role="radiogroup" aria-label={field.label} className="flex flex-wrap gap-2" onBlur={onBlur}>
      {field.opts?.map(o => {
        const active = value === o
        return (
          <button key={o} type="button" disabled={readOnly} role="radio" aria-checked={active}
            onClick={() => { if (!readOnly) { onChange(active ? "" : o); onBlur?.() } }}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all min-h-[44px] disabled:cursor-default ${
              active
                ? "bg-teal-50 dark:bg-teal-500/15 border-teal-300 dark:border-teal-500/40 text-teal-700 dark:text-teal-300"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >{o}</button>
        )
      })}
    </div>
  )
}

// ─── Checkbox pills ────────────────────────────────────────────────────────────
function CheckPills({ field, value, onChange, onBlur, readOnly }: {
  field: FormField; value: unknown; onChange: (v: unknown) => void
  onBlur?: () => void; readOnly: boolean
}) {
  const arr = (value as string[] | undefined) ?? []
  return (
    <div id={field.id} role="group" aria-label={field.label} className="flex flex-wrap gap-2">
      {field.opts?.map(o => {
        const active = arr.includes(o)
        return (
          <button key={o} type="button" disabled={readOnly} aria-pressed={active}
            onClick={() => {
              if (!readOnly) { onChange(active ? arr.filter(x => x !== o) : [...arr, o]); onBlur?.() }
            }}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all min-h-[44px] text-left disabled:cursor-default flex items-center gap-1.5 ${
              active
                ? "bg-teal-50 dark:bg-teal-500/15 border-teal-300 dark:border-teal-500/40 text-teal-700 dark:text-teal-300"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            {active && <IconCheck size={13} className="shrink-0" />}
            {o}
          </button>
        )
      })}
    </div>
  )
}

// ─── Rating ────────────────────────────────────────────────────────────────────
function RatingField({ field, value, onChange, onBlur, readOnly }: {
  field: FormField; value: unknown; onChange: (v: unknown) => void; onBlur?: () => void; readOnly: boolean
}) {
  const v = (value as number | undefined) ?? 0
  const [hover, setHover] = useState(0)
  const labels = ["", "Muy bajo", "Bajo", "Medio", "Alto", "Muy alto"]
  const active = hover || v
  return (
    <div id={field.id}>
      <div role="radiogroup" aria-label={field.label} className="flex gap-1.5">
        {[1,2,3,4,5].map(n => (
          <button key={n} type="button" disabled={readOnly} role="radio" aria-checked={v === n} aria-label={`${n} de 5`}
            onClick={() => { if (!readOnly) { onChange(v === n ? 0 : n); onBlur?.() } }}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110 disabled:cursor-default min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: n <= active ? "#F59E0B" : "#e5e7eb" }}
          >
            <IconStar size={28} filled={n <= active} />
          </button>
        ))}
      </div>
      {v > 0 && (
        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
          <span className="font-semibold text-amber-500">{v}/5</span> — {labels[v]}
        </p>
      )}
    </div>
  )
}

// ─── Campo genérico ────────────────────────────────────────────────────────────
export function CampoField({ field, value, onChange, onBlur, error, readOnly }: {
  field: FormField; value: unknown; onChange: (v: unknown) => void
  onBlur?: () => void; error?: string; readOnly: boolean
}) {
  const base = [
    "w-full border rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent",
    "disabled:bg-gray-50 disabled:text-gray-500 bg-white min-h-[44px] transition-colors",
    error ? "border-red-300 focus:ring-red-300" : "border-gray-200 focus:ring-teal-300",
  ].join(" ")

  if (field.type === "radio") return <RadioPills field={field} value={value} onChange={onChange} onBlur={onBlur} readOnly={readOnly} />
  if (field.type === "checks") return <CheckPills field={field} value={value} onChange={onChange} onBlur={onBlur} readOnly={readOnly} />
  if (field.type === "rating") return <RatingField field={field} value={value} onChange={onChange} onBlur={onBlur} readOnly={readOnly} />
  if (field.type === "textarea") return (
    <textarea id={field.id} value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} onBlur={onBlur}
      placeholder={field.ph} disabled={readOnly} rows={4} className={`${base} resize-none`} />
  )
  if (field.type === "select") return (
    <select id={field.id} value={(value as string) ?? ""} onChange={e => { onChange(e.target.value); onBlur?.() }} disabled={readOnly} className={base}>
      <option value="">— Seleccionar —</option>
      {field.opts?.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
  return (
    <input id={field.id} type={field.type} value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} onBlur={onBlur}
      placeholder={field.ph} disabled={readOnly} className={base} />
  )
}
