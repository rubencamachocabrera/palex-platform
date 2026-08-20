"use client"

import { TEAL } from "@/lib/brand"
import type { FormField } from "@/lib/form-schema"

// ─── Inline Field Editor ──────────────────────────────────────────────────────
export function InlineFieldEditor({ field, value, onChange }: {
  field: FormField
  value: unknown
  onChange: (v: unknown) => void
}) {
  const base = "text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 bg-gray-50 transition-colors"
  const ringStyle = { "--tw-ring-color": TEAL } as React.CSSProperties

  if (field.type === "subheader") {
    return (
      <div className="flex items-center gap-2 mt-1 mb-0.5 col-span-full">
        <span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: TEAL }}>
          {field.label}
        </span>
        <div className="flex-1 h-px bg-teal-100" />
      </div>
    )
  }

  if (field.type === "radio" && field.opts) {
    return (
      <div id={field.id} role="radiogroup" aria-label={field.label} className="flex flex-wrap gap-1.5">
        {field.opts.map(opt => (
          <button key={opt} type="button" role="radio" aria-checked={value === opt}
            onClick={() => onChange(value === opt ? "" : opt)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              value === opt ? "text-white font-medium border-transparent" : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
            }`}
            style={value === opt ? { backgroundColor: TEAL, borderColor: TEAL } : {}}
          >{opt}</button>
        ))}
      </div>
    )
  }

  if (field.type === "checks" && field.opts) {
    const arr = Array.isArray(value) ? (value as string[]) : []
    return (
      <div id={field.id} role="group" aria-label={field.label} className="flex flex-wrap gap-1.5">
        {field.opts.map(opt => {
          const on = arr.includes(opt)
          return (
            <button key={opt} type="button" aria-pressed={on}
              onClick={() => onChange(on ? arr.filter((x: string) => x !== opt) : [...arr, opt])}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                on ? "text-white font-medium border-transparent" : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
              }`}
              style={on ? { backgroundColor: TEAL, borderColor: TEAL } : {}}
            >{opt}</button>
          )
        })}
      </div>
    )
  }

  if (field.type === "select" && field.opts) {
    return (
      <div id={field.id} role="group" aria-label={field.label} className="flex flex-wrap gap-1.5">
        {field.opts.map(opt => (
          <button key={opt} type="button" aria-pressed={value === opt}
            onClick={() => onChange(value === opt ? "" : opt)}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
              value === opt ? "text-white font-medium border-transparent" : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
            }`}
            style={value === opt ? { backgroundColor: TEAL, borderColor: TEAL } : {}}
          >{opt}</button>
        ))}
      </div>
    )
  }

  if (field.type === "rating") {
    const num = typeof value === "number" ? value : 0
    return (
      <div id={field.id} role="radiogroup" aria-label={field.label} className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} type="button" role="radio" aria-checked={star === num} aria-label={`${star} de 5`}
            onClick={() => onChange(star === num ? 0 : star)}
            className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <svg width="16" height="16" viewBox="0 0 24 24"
              fill={star <= num ? "#fbbf24" : "none"} stroke={star <= num ? "#fbbf24" : "#d1d5db"} strokeWidth="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
        ))}
      </div>
    )
  }

  if (field.type === "textarea") {
    return (
      <textarea id={field.id} className={`${base} resize-none`} style={ringStyle} rows={3}
        value={typeof value === "string" ? value : ""}
        placeholder={field.ph ?? ""}
        onChange={e => onChange(e.target.value)}
      />
    )
  }

  const inputType = field.type === "number" ? "number"
    : field.type === "date" ? "date" : field.type === "month" ? "month"
    : field.type === "time" ? "time" : field.type === "email" ? "email"
    : field.type === "tel" ? "tel" : "text"

  return (
    <input id={field.id} type={inputType} className={base} style={ringStyle}
      value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
      placeholder={field.ph ?? ""}
      onChange={e => onChange(field.type === "number"
        ? (e.target.value === "" ? "" : Number(e.target.value))
        : e.target.value)}
    />
  )
}
