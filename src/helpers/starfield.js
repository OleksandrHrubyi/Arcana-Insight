// Living-sky overlay for the cinematic home. The night sky itself is a real
// photograph (see SkyHomePage); this adds gentle life ON TOP — a faint field of
// twinkling stars (ambient shimmer, nothing travels across) plus a rare meteor.
// Honours prefers-reduced-motion (renders nothing / no loop).
// Returns { start, stop, resize }.

// Blackbody-ish twinkle colours.
const STAR_COLORS = ['255,255,255', '204,220,255', '255,236,210']

export const createShootingStars = (canvas) => {
  const ctx = canvas ? canvas.getContext('2d') : null
  let w = 0
  let h = 0
  let dpr = 1
  let raf = 0
  let start0 = 0
  let running = false
  let reduced = false
  let shoot = null
  let nextShoot = 8
  let seed = 77
  let stars = []

  // Tiny LCG so meteor timing/placement varies without Math.random.
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  const size = () => {
    if (!ctx) return false
    w = canvas.clientWidth
    h = canvas.clientHeight
    if (!w || !h) return false
    dpr = Math.min(window.devicePixelRatio || 2, 3)
    canvas.width = w * dpr
    canvas.height = h * dpr
    reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Build the twinkle field (stable layout via a dedicated seed).
    let ls = 90210
    const lr = () => {
      ls = (ls * 1664525 + 1013904223) % 4294967296
      return ls / 4294967296
    }
    stars = []
    const count = Math.round((w * h) / 6200)
    for (let i = 0; i < count; i += 1) {
      const y = lr() * h
      // Fade stars out over the bottom UI (nav) so they never read as a
      // blinking garland above the menu.
      const bf = y > h * 0.72 ? Math.max(0, (h - y) / (h * 0.28)) : 1
      stars.push({
        x: lr() * w,
        y,
        r: 0.4 + lr() * 1.2,
        a: 0.15 + lr() * 0.42,
        tw: 0.4 + lr() * 1.4, // twinkle speed (rad/s)
        ph: lr() * 6.283,
        bf,
        c: STAR_COLORS[(lr() * STAR_COLORS.length) | 0],
      })
    }
    return true
  }

  const frame = (ts) => {
    if (!w && !size()) {
      raf = window.requestAnimationFrame(frame)
      return
    }
    if (!start0) start0 = ts
    const t = (ts - start0) / 1000
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    // Twinkling star field — gentle ambient shimmer (in place, never travels).
    for (let i = 0; i < stars.length; i += 1) {
      const s = stars[i]
      const tw = 0.5 + 0.5 * Math.sin(t * s.tw + s.ph)
      // Gentle shimmer, not a blinking garland: shallow modulation, faded near UI.
      const a = s.a * s.bf * (0.55 + 0.45 * tw)
      if (a < 0.012) continue
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, 7)
      ctx.fillStyle = `rgba(${s.c},${a})`
      ctx.fill()
    }

    if (!shoot && t >= nextShoot) {
      const fromLeft = rand() > 0.5
      const speed = 78 + rand() * 42
      const dir = (fromLeft ? 1 : -1) * (0.55 + rand() * 0.4)
      shoot = {
        x: fromLeft ? -30 : w + 30,
        y: h * (0.05 + rand() * 0.4),
        vx: dir * speed,
        vy: (0.35 + rand() * 0.3) * speed,
        age: 0,
        life: 1.4 + rand() * 0.8,
        last: t,
      }
    }
    if (shoot) {
      shoot.age += t - shoot.last
      shoot.last = t
      const p = Math.min(1, shoot.age / shoot.life)
      const fade = Math.sin(Math.PI * p)
      const hx = shoot.x + shoot.vx * shoot.age
      const hy = shoot.y + shoot.vy * shoot.age
      const tx = hx - shoot.vx * 0.5
      const ty = hy - shoot.vy * 0.5
      const g = ctx.createLinearGradient(tx, ty, hx, hy)
      g.addColorStop(0, 'rgba(214,230,255,0)')
      g.addColorStop(1, `rgba(236,244,255,${0.7 * fade})`)
      ctx.strokeStyle = g
      ctx.lineWidth = 0.9
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(hx, hy)
      ctx.stroke()
      if (shoot.age >= shoot.life) {
        shoot = null
        // Rare — a meteor every ~16–30s, not a constant stream.
        nextShoot = t + 16 + (t % 14)
      }
    }
    if (running) raf = window.requestAnimationFrame(frame)
  }

  const start = () => {
    if (!size()) return
    if (reduced) return // static photo is enough; no meteors
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
    size()
  }

  return { start, stop, resize }
}
