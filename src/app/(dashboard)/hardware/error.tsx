"use client"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar Materiales</h2>
      <p className="text-sm text-gray-500 mb-4">{error.message}</p>
      <button onClick={reset} className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 transition-colors">
        Reintentar
      </button>
    </div>
  )
}
