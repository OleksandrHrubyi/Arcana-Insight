// Shared photoreal moon renderer. A real lunar photograph (NASA / LRO nearside
// mosaic, public domain) is masked to a disk and shadowed with a terminator
// placed from the on-device illumination/waxing values. The dark-region polygon
// maps illumination exactly: new = fully shadowed (faint earthshine), full =
// fully lit. Used by the Sky hero and the month-calendar mini-moons.
import moonTextureUrl from 'src/assets/images/moon.webp'

const MOON_DISK = 1.0 // the photo's lunar disk fills the frame edge-to-edge

const moonImg = new Image()
moonImg.src = moonTextureUrl

const readyCallbacks = new Set()
moonImg.onload = () => readyCallbacks.forEach((cb) => cb())

export const isMoonReady = () => moonImg.complete && moonImg.naturalWidth > 0

// Subscribe to be notified once the photo has decoded (returns an unsubscribe).
// If it's already loaded the callback is not invoked — caller should draw first.
export const onMoonReady = (cb) => {
  readyCallbacks.add(cb)
  return () => readyCallbacks.delete(cb)
}

export const drawMoon = (canvas, illumination, waxing, { detail = true } = {}) => {
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 2, 3)
  const cssSize = canvas.clientWidth || (detail ? 240 : 18)
  canvas.width = cssSize * dpr
  canvas.height = cssSize * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const size = cssSize
  const cx = size / 2
  const cy = size / 2
  const r = (size / 2) * (detail ? 0.98 : 0.94)
  const f = Math.max(0, Math.min(1, illumination))
  const litDir = waxing ? 1 : -1
  ctx.clearRect(0, 0, size, size)

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()

  // Lunar surface: the real photograph, or a neutral disk until it loads.
  if (isMoonReady()) {
    const dw = (2 * r) / MOON_DISK
    ctx.drawImage(moonImg, cx - dw / 2, cy - dw / 2, dw, dw)
  } else {
    const base = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r)
    base.addColorStop(0, '#d7dbe4')
    base.addColorStop(1, '#9498a6')
    ctx.fillStyle = base
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  }

  // Night side: dark-region polygon with a soft-blurred terminator.
  const N = detail ? 90 : 44
  ctx.save()
  ctx.filter = `blur(${detail ? Math.max(1, r * 0.012) : 0.6}px)`
  ctx.beginPath()
  for (let i = 0; i <= N; i += 1) {
    const y = -r + (2 * r * i) / N
    const X = Math.sqrt(Math.max(0, r * r - y * y))
    const px = cx + litDir * X * (1 - 2 * f)
    const py = cy + y
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  for (let i = N; i >= 0; i -= 1) {
    const y = -r + (2 * r * i) / N
    const X = Math.sqrt(Math.max(0, r * r - y * y))
    ctx.lineTo(cx - litDir * X, cy + y)
  }
  ctx.closePath()
  const sh = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r)
  sh.addColorStop(0, `rgba(6,9,18,${detail ? 0.9 : 0.95})`)
  sh.addColorStop(1, `rgba(4,7,14,${detail ? 0.95 : 0.98})`)
  ctx.fillStyle = sh
  ctx.fill()
  ctx.restore()

  // Limb darkening so the lit disk reads as a sphere, not a flat sticker.
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  const ring = ctx.createRadialGradient(cx, cy, r * 0.82, cx, cy, r)
  ring.addColorStop(0, 'rgba(0,0,0,0)')
  ring.addColorStop(1, 'rgba(0,0,0,0.34)')
  ctx.fillStyle = ring
  ctx.fill()
  ctx.restore()
}
