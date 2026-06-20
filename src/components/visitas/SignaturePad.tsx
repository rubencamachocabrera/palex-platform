"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { TEAL, TEAL_DARK } from "@/lib/brand"

interface SignaturePadProps {
  onSave: (dataUrl: string) => void
  initialValue?: string
  label?: string
}

export function SignaturePad({ onSave, initialValue, label }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [showCanvas, setShowCanvas] = useState(!initialValue)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  // Resize canvas to match container while keeping crisp lines
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = 2
    ctx.strokeStyle = "#111827"

    // Fill white background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, rect.width, rect.height)

    setHasStrokes(false)
  }, [])

  useEffect(() => {
    if (!showCanvas) return
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    return () => window.removeEventListener("resize", resizeCanvas)
  }, [showCanvas, resizeCanvas])

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)

    const pt = getPoint(e)
    lastPoint.current = pt
    setIsDrawing(true)

    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(pt.x, pt.y)
    // Draw a dot for single taps
    ctx.lineTo(pt.x + 0.1, pt.y + 0.1)
    ctx.stroke()
    setHasStrokes(true)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing || !lastPoint.current) return
    e.preventDefault()

    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!ctx) return

    const pt = getPoint(e)

    // Smooth curve using quadratic bezier
    const mid = {
      x: (lastPoint.current.x + pt.x) / 2,
      y: (lastPoint.current.y + pt.y) / 2,
    }

    ctx.beginPath()
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, mid.x, mid.y)
    ctx.stroke()

    lastPoint.current = pt
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    setIsDrawing(false)
    lastPoint.current = null
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, rect.width, rect.height)
    setHasStrokes(false)
  }

  function saveSignature() {
    const canvas = canvasRef.current
    if (!canvas || !hasStrokes) return
    const dataUrl = canvas.toDataURL("image/png")
    onSave(dataUrl)
    setShowCanvas(false)
  }

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {label}
        </p>
      )}

      {/* Saved signature display */}
      {!showCanvas && initialValue && (
        <div className="relative">
          <div
            className="border border-gray-200 rounded-lg bg-white overflow-hidden"
            style={{ padding: "12px" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={initialValue}
              alt={label ?? "Firma"}
              className="max-h-[120px] w-auto mx-auto block"
              style={{ imageRendering: "auto" }}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCanvas(true)}
            className="mt-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
            style={{ color: TEAL }}
          >
            Cambiar firma
          </button>
        </div>
      )}

      {/* Canvas for drawing */}
      {showCanvas && (
        <div className="flex flex-col gap-2">
          <div
            ref={containerRef}
            className="relative rounded-lg overflow-hidden"
            style={{
              border: hasStrokes ? `1.5px solid ${TEAL}40` : "2px dashed #d1d5db",
              height: "clamp(120px, 20vw, 150px)",
              background: "#ffffff",
              transition: "border-color 0.2s",
            }}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="absolute inset-0 cursor-crosshair"
              style={{ touchAction: "none" }}
            />
            {!hasStrokes && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <p className="text-sm text-gray-300">Firme aqui</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearCanvas}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors min-h-[36px] cursor-pointer"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={saveSignature}
              disabled={!hasStrokes}
              className="text-xs font-semibold px-4 py-1.5 rounded-lg text-white transition-all min-h-[36px] disabled:opacity-40 cursor-pointer hover:opacity-90"
              style={{ backgroundColor: hasStrokes ? TEAL : TEAL_DARK }}
            >
              Firmar
            </button>
            {initialValue && (
              <button
                type="button"
                onClick={() => setShowCanvas(false)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg text-gray-400 hover:text-gray-600 transition-colors min-h-[36px] cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state: no signature and canvas hidden */}
      {!showCanvas && !initialValue && (
        <button
          type="button"
          onClick={() => setShowCanvas(true)}
          className="w-full border-2 border-dashed border-gray-200 rounded-lg text-center hover:border-gray-300 transition-colors group cursor-pointer"
          style={{ padding: "20px 12px", height: "clamp(120px, 20vw, 150px)" }}
        >
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 group-hover:bg-teal-50 transition-colors mb-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-teal-500 transition-colors">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              <path d="m15 5 4 4"/>
            </svg>
          </span>
          <p className="text-xs font-medium text-gray-500">Pulse para firmar</p>
        </button>
      )}
    </div>
  )
}
