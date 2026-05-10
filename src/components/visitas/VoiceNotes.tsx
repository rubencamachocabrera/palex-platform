"use client"

import { useState, useRef, useEffect } from "react"

const TEAL = "#00A99D"

export interface AudioNota {
  id: string
  blob: string        // base64 audio/webm
  mimeType: string
  duration: number    // segundos
  transcripcion?: string
  createdAt: number
}

interface VoiceNotesProps {
  notas: AudioNota[]
  onChange: (notas: AudioNota[]) => void
  readOnly?: boolean
}

type RecordState = "idle" | "recording" | "processing"

export function VoiceNotes({ notas, onChange, readOnly = false }: VoiceNotesProps) {
  const [state, setState] = useState<RecordState>("idle")
  const [elapsed, setElapsed] = useState(0)
  const [supported, setSupported] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setSupported(false)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4"

      const mr = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => processRecording(mimeType)

      mr.start(250) // chunk cada 250ms para mejor compatibilidad
      startTimeRef.current = Date.now()
      setState("recording")
      setElapsed(0)

      timerRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } catch {
      setSupported(false)
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    setState("processing")
  }

  async function processRecording(mimeType: string) {
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
    const blob = new Blob(chunksRef.current, { type: mimeType })

    // Convertir a base64
    const base64 = await blobToBase64(blob)

    // Intentar transcripcion con Web Speech API (solo si hay soporte y conexion)
    let transcripcion: string | undefined
    if (navigator.onLine && "webkitSpeechRecognition" in window) {
      transcripcion = await transcribeLastRecording(blob, mimeType)
    }

    const nueva: AudioNota = {
      id: `audio-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      blob: base64,
      mimeType,
      duration,
      transcripcion,
      createdAt: Date.now(),
    }

    onChange([...notas, nueva])
    setState("idle")
    setElapsed(0)
  }

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  function transcribeLastRecording(blob: Blob, _mimeType: string): Promise<string | undefined> {
    return new Promise(resolve => {
      try {
        // Web Speech API no puede transcribir un Blob directamente —
        // requiere microfono en tiempo real. Devolvemos undefined para
        // indicar que no hay transcripcion automatica post-grabacion.
        // La transcripcion en tiempo real requiere un flujo diferente.
        void blob
        resolve(undefined)
      } catch {
        resolve(undefined)
      }
    })
  }

  function deleteNota(id: string) {
    onChange(notas.filter(n => n.id !== id))
  }

  function formatDuration(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
  }

  function getAudioSrc(nota: AudioNota): string {
    return nota.blob // Ya es data URL base64
  }

  if (!supported) {
    return (
      <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
        <p className="text-xs text-amber-600">
          Tu navegador no soporta grabacion de audio, o no se concedio permiso al microfono.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🎙️</span>
          <h3 className="text-sm font-semibold text-gray-700">Notas de voz</h3>
          {notas.length > 0 && (
            <span className="text-xs text-gray-400">{notas.length} nota{notas.length > 1 ? "s" : ""}</span>
          )}
        </div>
      </div>

      {/* Boton de grabacion */}
      {!readOnly && (
        <div className="flex flex-col items-center gap-3 mb-4">
          {state === "idle" && (
            <button
              onClick={startRecording}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border-2 border-dashed transition-all hover:shadow-md active:scale-95"
              style={{ borderColor: TEAL, color: TEAL }}
            >
              <span className="text-2xl">🎙️</span>
              <span className="text-sm font-semibold">Iniciar grabacion</span>
            </button>
          )}

          {state === "recording" && (
            <button
              onClick={stopRecording}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-white transition-all active:scale-95 shadow-lg"
              style={{ backgroundColor: "#ef4444" }}
            >
              {/* Indicador pulsante */}
              <span className="relative flex h-4 w-4 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-200 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-white" />
              </span>
              <span className="text-sm font-semibold">
                Grabando... {formatDuration(elapsed)}
              </span>
              <span className="text-xs opacity-75">Toca para parar</span>
            </button>
          )}

          {state === "processing" && (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
              <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
              Procesando audio...
            </div>
          )}
        </div>
      )}

      {/* Lista de notas */}
      {notas.length > 0 && (
        <ul className="space-y-3">
          {notas.map(nota => (
            <li key={nota.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {/* Cabecera nota */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => setExpandedId(expandedId === nota.id ? null : nota.id)}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors"
                  style={{ backgroundColor: `${TEAL}15`, color: TEAL }}
                >
                  {expandedId === nota.id ? "⏸" : "▶"}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600">
                    {formatDuration(nota.duration)} · {formatTime(nota.createdAt)}
                  </p>
                  {nota.transcripcion && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{nota.transcripcion}</p>
                  )}
                  {!nota.transcripcion && (
                    <p className="text-xs text-gray-300 mt-0.5 italic">Sin transcripcion</p>
                  )}
                </div>
                {!readOnly && (
                  <button
                    onClick={() => deleteNota(nota.id)}
                    className="shrink-0 w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Player expandido */}
              {expandedId === nota.id && (
                <div className="px-4 pb-3 border-t border-gray-50 pt-3">
                  <audio
                    controls
                    src={getAudioSrc(nota)}
                    className="w-full h-10"
                    style={{ colorScheme: "light" }}
                  >
                    Tu navegador no soporta reproduccion de audio.
                  </audio>
                  {nota.transcripcion && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 font-medium mb-1">Transcripcion:</p>
                      <p className="text-sm text-gray-700">{nota.transcripcion}</p>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Estado vacio */}
      {notas.length === 0 && !readOnly && state === "idle" && (
        <p className="text-xs text-gray-300 text-center">
          Graba notas de voz rapidas durante la visita. Se guardan junto al formulario.
        </p>
      )}
    </div>
  )
}
