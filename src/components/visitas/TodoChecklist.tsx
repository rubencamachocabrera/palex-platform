"use client"

import { useState, useRef, KeyboardEvent } from "react"
import { TEAL } from "@/lib/brand"

export interface TodoItem {
  id: string
  text: string
  done: boolean
  createdAt: number
}

interface TodoChecklistProps {
  items: TodoItem[]
  onChange: (items: TodoItem[]) => void
  readOnly?: boolean
}

export function TodoChecklist({ items, onChange, readOnly = false }: TodoChecklistProps) {
  const [inputText, setInputText] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function addItem() {
    const text = inputText.trim()
    if (!text) return
    const nuevo: TodoItem = {
      id: `todo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text,
      done: false,
      createdAt: Date.now(),
    }
    onChange([...items, nuevo])
    setInputText("")
    inputRef.current?.focus()
  }

  function toggleItem(id: string) {
    onChange(items.map(item => item.id === id ? { ...item, done: !item.done } : item))
  }

  function deleteItem(id: string) {
    onChange(items.filter(item => item.id !== id))
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addItem() }
    if (e.key === "Escape") setInputText("")
  }

  const pendientes = items.filter(i => !i.done).length
  const completadas = items.filter(i => i.done).length

  return (
    <div className="mt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <h3 className="text-sm font-semibold text-gray-700">Pendientes de la visita</h3>
          {items.length > 0 && (
            <span className="text-xs text-gray-400 font-normal">
              {pendientes > 0 ? `${pendientes} pendiente${pendientes > 1 ? "s" : ""}` : "Todo hecho"}
              {completadas > 0 && ` · ${completadas} hecho${completadas > 1 ? "s" : ""}`}
            </span>
          )}
        </div>
        {completadas > 0 && !readOnly && (
          <button
            onClick={() => onChange(items.filter(i => !i.done))}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            Limpiar hechos
          </button>
        )}
      </div>

      {/* Lista */}
      {items.length > 0 && (
        <ul className="space-y-2 mb-3">
          {items.map(item => (
            <li
              key={item.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                item.done
                  ? "bg-gray-50 border-gray-100 opacity-60"
                  : "bg-white border-gray-200 shadow-sm"
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => !readOnly && toggleItem(item.id)}
                disabled={readOnly}
                className="shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all disabled:cursor-default"
                style={item.done
                  ? { backgroundColor: TEAL, borderColor: TEAL }
                  : { borderColor: "#d1d5db" }
                }
              >
                {item.done && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>

              {/* Texto */}
              <span className={`flex-1 text-sm leading-snug ${item.done ? "line-through text-gray-400" : "text-gray-700"}`}>
                {item.text}
              </span>

              {/* Eliminar */}
              {!readOnly && (
                <button
                  onClick={() => deleteItem(item.id)}
                  className="shrink-0 w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Input para nuevo item */}
      {!readOnly && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Anotar pendiente... (Enter para guardar)"
            className="flex-1 px-4 py-3 text-sm rounded-xl border border-dashed border-gray-300 focus:outline-none focus:border-gray-400 focus:bg-white bg-gray-50 placeholder-gray-300 transition-colors"
          />
          <button
            onClick={addItem}
            disabled={!inputText.trim()}
            className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg transition-all disabled:opacity-30"
            style={{ backgroundColor: TEAL }}
          >
            +
          </button>
        </div>
      )}

      {/* Estado vacío */}
      {items.length === 0 && !readOnly && (
        <p className="text-xs text-gray-300 text-center mt-2">
          Anota aqui los deberes de la visita: planos que pedir, datos que confirmar, seguimientos...
        </p>
      )}
    </div>
  )
}
