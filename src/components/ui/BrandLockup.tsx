/**
 * BrandLockup — logotipo "Palex | InLab" integrado en superficies oscuras.
 *
 * El wordmark oficial sale de /logo-palex.png (fondo transparente) recortado con
 * mask-image: así se puede pintar con cualquier color/degradado sin redibujar ni
 * duplicar el asset de marca. Coordenadas medidas sobre el PNG original 2537x1241.
 */

const SRC_W = 2537
const SRC_H = 1241
// Caja de la palabra "Palex" y de la "P" dentro del PNG
const WORD = { x: 236, y: 444, w: 1008, h: 240 }
const P    = { x: 236, y: 444, w: 226,  h: 240 }

function maskStyle(box: typeof WORD, height: number): React.CSSProperties {
  const k = height / box.h
  const mask = `url(/logo-palex.png) ${-box.x * k}px ${-box.y * k}px / ${SRC_W * k}px ${SRC_H * k}px no-repeat`
  return {
    display: "inline-block",
    width: box.w * k,
    height,
    WebkitMask: mask,
    mask,
  }
}

/** Palabra "Palex" recortada; el color lo pone la clase (background). */
export function PalexWordmark({ height = 20, className = "" }: { height?: number; className?: string }) {
  return <span role="img" aria-label="Palex" className={className} style={maskStyle(WORD, height)} />
}

/** Solo la "P" — para el estado colapsado. */
export function PalexMark({ height = 16, className = "" }: { height?: number; className?: string }) {
  return <span role="img" aria-label="Palex" className={className} style={maskStyle(P, height)} />
}

/** Lockup completo: Palex · divisor de luz · InLab. */
export function BrandLockup({ size = "md" }: { size?: "md" | "lg" }) {
  const h = size === "lg" ? 30 : 19
  return (
    <span className={`brand-lockup brand-lockup-${size} inline-flex items-center`}>
      <PalexWordmark height={h} className="brand-wordmark" />
      <span className="brand-divider" aria-hidden="true" />
      <span className="brand-product">
        InLab
        <span className="brand-product-dot" aria-hidden="true" />
      </span>
    </span>
  )
}
