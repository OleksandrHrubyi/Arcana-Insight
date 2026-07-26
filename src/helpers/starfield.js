// Procedural, animated night sky for the cinematic home backdrop. A static
// layer (Milky Way haze, nebulosity, dust) is pre-rendered once to an offscreen
// canvas; on top, stars twinkle, the field drifts slowly, and a shooting star
// streaks by now and then. Deterministic layout (seeded) so the sky is stable
// across resizes; honours prefers-reduced-motion by rendering a single frame.

// Blackbody-ish palette weighted toward white / blue-white, a few warm stars.
const STAR_COLORS = [
  '202,216,255',
  '202,216,255',
  '224,232,255',
  '240,244,255',
  '240,244,255',
  '246,246,240',
  '255,248,230',
  '255,236,206',
  '255,214,170',
  '255,190,158',
]

const seeded = (seed) => {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

// Milky Way haze + nebulosity + dust lanes — the static backdrop.
const paintHaze = (x, w, h, rnd) => {
  const ax = w * 0.66
  const ay = h * 0.16
  const ang = -1.02
  const nx = Math.cos(ang)
  const ny = Math.sin(ang)
  const pxv = -ny
  const pyv = nx
  const diag = Math.hypot(w, h)
  const bandW = Math.min(h, w * 1.4) * 0.3

  x.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 90; i += 1) {
    const t = (rnd() - 0.5) * 1.25
    const perp = (rnd() - 0.5) * bandW * 1.1
    const X = ax + nx * t * diag + pxv * perp
    const Y = ay + ny * t * diag + pyv * perp
    const rr = 44 + rnd() * 150
    const fall = Math.exp(-Math.pow(perp / (bandW * 0.6), 2))
    const a = (0.015 + rnd() * 0.05) * fall
    const col = rnd() > 0.5 ? '176,168,188' : '150,166,196'
    const g = x.createRadialGradient(X, Y, 0, X, Y, rr)
    g.addColorStop(0, `rgba(${col},${a})`)
    g.addColorStop(1, `rgba(${col},0)`)
    x.fillStyle = g
    x.beginPath()
    x.arc(X, Y, rr, 0, 7)
    x.fill()
  }
  for (const [fx, fy, c] of [
    [0.72, 0.14, '70,96,120'],
    [0.5, 0.36, '120,86,96'],
    [0.34, 0.56, '64,104,110'],
  ]) {
    const X = fx * w
    const Y = fy * h
    const rr = h * 0.2
    const g = x.createRadialGradient(X, Y, 0, X, Y, rr)
    g.addColorStop(0, `rgba(${c},0.05)`)
    g.addColorStop(1, `rgba(${c},0)`)
    x.fillStyle = g
    x.beginPath()
    x.arc(X, Y, rr, 0, 7)
    x.fill()
  }
  x.globalCompositeOperation = 'source-over'
  for (let i = 0; i < 26; i += 1) {
    const t = (rnd() - 0.5) * 1.1
    const perp = (rnd() - 0.5) * bandW * 0.5
    const X = ax + nx * t * diag + pxv * perp
    const Y = ay + ny * t * diag + pyv * perp
    const rr = 30 + rnd() * 90
    const g = x.createRadialGradient(X, Y, 0, X, Y, rr)
    g.addColorStop(0, 'rgba(4,7,13,0.16)')
    g.addColorStop(1, 'rgba(4,7,13,0)')
    x.fillStyle = g
    x.beginPath()
    x.arc(X, Y, rr, 0, 7)
    x.fill()
  }
}

// Star list with per-star twinkle phase/speed. Steep power-law brightness so
// most are faint pinpoints and only a rare few are bright.
const buildStars = (w, h, rnd) => {
  const ax = w * 0.66
  const ay = h * 0.16
  const ang = -1.02
  const nx = Math.cos(ang)
  const ny = Math.sin(ang)
  const pxv = -ny
  const pyv = nx
  const diag = Math.hypot(w, h)
  const bandW = Math.min(h, w * 1.4) * 0.3
  const perpDist = (X, Y) => Math.abs((X - ax) * pxv + (Y - ay) * pyv)
  const count = Math.round((w * h) / 640)
  const stars = []
  for (let i = 0; i < count; i += 1) {
    let X
    let Y
    if (rnd() < 0.4) {
      const t = (rnd() - 0.5) * 1.3
      const perp = (rnd() - 0.5) * bandW * 1.3
      X = ax + nx * t * diag + pxv * perp
      Y = ay + ny * t * diag + pyv * perp
    } else {
      X = rnd() * w
      Y = rnd() * h
    }
    if (X < -10 || X > w + 10 || Y < -10 || Y > h + 10) continue
    const near = Math.exp(-Math.pow(perpDist(X, Y) / (bandW * 0.7), 2))
    const b = Math.pow(rnd(), 3.4) * (0.62 + 0.4 * near)
    stars.push({
      x: X,
      y: Y,
      r: 0.26 + b * 1.5,
      a: Math.min(1, 0.2 + b * 0.72),
      c: STAR_COLORS[Math.min(STAR_COLORS.length - 1, (rnd() * STAR_COLORS.length) | 0)],
      b,
      tw: 0.5 + rnd() * 2.4, // twinkle speed (rad/s)
      ph: rnd() * 6.283, // twinkle phase
      amp: 0.12 + rnd() * 0.32, // twinkle depth
    })
  }
  return stars
}

// Animated starfield controller. Returns { start, stop, resize }.
export const createStarfield = (canvas, { seed = 20260726 } = {}) => {
  const ctx = canvas ? canvas.getContext('2d') : null
  let stars = []
  let haze = null
  let w = 0
  let h = 0
  let dpr = 1
  let raf = 0
  let start0 = 0
  let running = false
  let reduced = false
  const drift = { x: -0.5, y: 0.22 } // px/s — barely-perceptible parallax
  let shoot = null
  let nextShoot = 4

  const build = () => {
    if (!ctx) return false
    w = canvas.clientWidth
    h = canvas.clientHeight
    if (!w || !h) return false
    dpr = Math.min(window.devicePixelRatio || 2, 3)
    canvas.width = w * dpr
    canvas.height = h * dpr
    haze = document.createElement('canvas')
    haze.width = w * dpr
    haze.height = h * dpr
    const hx = haze.getContext('2d')
    hx.setTransform(dpr, 0, 0, dpr, 0, 0)
    paintHaze(hx, w, h, seeded(seed))
    stars = buildStars(w, h, seeded(seed + 9))
    reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return true
  }

  const wrap = (v, max) => ((v % max) + max) % max

  const drawStar = (s, ax, ay, a) => {
    ctx.beginPath()
    ctx.arc(ax, ay, s.r, 0, 7)
    ctx.fillStyle = `rgba(${s.c},${a})`
    ctx.fill()
    if (s.b > 0.9) {
      const gr = s.r * 4.2
      const g = ctx.createRadialGradient(ax, ay, 0, ax, ay, gr)
      g.addColorStop(0, `rgba(${s.c},${0.34 * a})`)
      g.addColorStop(1, `rgba(${s.c},0)`)
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(ax, ay, gr, 0, 7)
      ctx.fill()
      if (s.b > 0.965) {
        const sp = s.r * (3.5 + s.b * 2.5)
        ctx.strokeStyle = `rgba(${s.c},${0.28 * a})`
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(ax - sp, ay)
        ctx.lineTo(ax + sp, ay)
        ctx.moveTo(ax, ay - sp)
        ctx.lineTo(ax, ay + sp)
        ctx.stroke()
      }
      ctx.globalCompositeOperation = 'source-over'
    }
  }

  const render = (t) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    if (haze) ctx.drawImage(haze, 0, 0, w, h)
    const dx = drift.x * t
    const dy = drift.y * t
    for (const s of stars) {
      const ax = wrap(s.x + dx, w)
      const ay = wrap(s.y + dy, h)
      const tw = reduced ? 1 : 1 - s.amp + s.amp * Math.sin(t * s.tw + s.ph)
      drawStar(s, ax, ay, Math.min(1, s.a * tw))
    }
    if (shoot) {
      const p = shoot.age / shoot.life
      const fade = Math.sin(Math.PI * p)
      const hx = shoot.x + shoot.vx * shoot.age
      const hy = shoot.y + shoot.vy * shoot.age
      const tx = hx - shoot.vx * 0.16
      const ty = hy - shoot.vy * 0.16
      const g = ctx.createLinearGradient(tx, ty, hx, hy)
      g.addColorStop(0, 'rgba(214,230,255,0)')
      g.addColorStop(1, `rgba(236,244,255,${0.85 * fade})`)
      ctx.strokeStyle = g
      ctx.lineWidth = 1.6
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(hx, hy)
      ctx.stroke()
    }
  }

  const frame = (ts) => {
    if (!start0) start0 = ts
    const t = (ts - start0) / 1000
    if (!reduced) {
      if (!shoot && t >= nextShoot) {
        const rnd = seeded((seed + Math.round(t * 1000)) >>> 0)
        const fromLeft = rnd() > 0.5
        const speed = 320 + rnd() * 220
        const dir = (fromLeft ? 1 : -1) * (0.5 + rnd() * 0.4)
        shoot = {
          x: fromLeft ? -30 : w + 30,
          y: h * (0.08 + rnd() * 0.4),
          vx: dir * speed,
          vy: (0.35 + rnd() * 0.3) * speed,
          age: 0,
          life: 0.6 + rnd() * 0.4,
          last: t,
        }
      }
      if (shoot) {
        shoot.age += t - shoot.last
        shoot.last = t
        if (shoot.age >= shoot.life) {
          shoot = null
          nextShoot = t + 5 + (t % 9)
        }
      }
    }
    render(t)
    if (running && !reduced) raf = window.requestAnimationFrame(frame)
  }

  const start = () => {
    if (!build()) return
    if (reduced) {
      render(0)
      return
    }
    running = true
    start0 = 0
    raf = window.requestAnimationFrame(frame)
  }

  const stop = () => {
    running = false
    if (raf) window.cancelAnimationFrame(raf)
    raf = 0
  }

  const resize = () => {
    const wasRunning = running
    stop()
    if (wasRunning || reduced) start()
    else if (build()) render(0)
  }

  return { start, stop, resize }
}
