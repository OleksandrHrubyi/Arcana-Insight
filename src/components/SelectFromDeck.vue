<template>
  <div class="deck-stage" ref="stage">
    <!-- карти -->
    <div
      v-for="(c, i) in deck"
      :key="i"
      ref="cards"
      class="card"
      :class="{ selected: selectedIndex === i }"
      @click="onCardClick(i)"
    >
      <div class="face">
        <div class="title">{{ c.title || c.name || ('Card ' + (i+1)) }}</div>
        <div class="text">
          {{ (c.meanings && (c.meanings.upright || c.meanings)) || c.description || '—' }}
        </div>
      </div>
    </div>

    <!-- підказка -->
    <div class="hint" v-if="!isBusy && selectedIndex === null">
      Торкнись карти або натисни «Перемішати»
    </div>

    <!-- кнопки -->
    <div class="controls">
      <button class="btn" :disabled="isBusy" @click="riffleShuffle">Перемішати</button>
      <button class="btn ghost" :disabled="isBusy" @click="fanOut(true)">Розкласти</button>
    </div>
  </div>
</template>

<script>
import { gsap } from 'gsap'

export default {
  name: 'GsapCircleDeck',
  props: {
    deck: { type: Array, required: true }
  },
  data () {
    return {
      // розміри карт
      cw: 110, ch: 170,

      // геометрія сцени
      rOuter: 0,
      center: { x: 0, y: 0 },

      // параметри віяла
      arc: 200,          // загальна кутова ширина віяла (градуси)
      spread: 0.8,      // РОЗРІДЖЕННЯ (1.0 — щільно; 1.3–1.6 — рідше)
      radiusFactor: 0.60,// 0.45…0.58 — як близько до країв/центру

      // стани
      selectedIndex: null,
      isBusy: true,
      tl: null
    }
  },
  mounted () {
    this.$nextTick(() => {
      this.measure()
      window.addEventListener('resize', this.measure, { passive: true })
      this.intro()
    })
  },
  beforeUnmount () {
    window.removeEventListener('resize', this.measure)
    this.tl && this.tl.kill()
  },
  methods: {
    measure () {
      const el = this.$refs.stage
      const w = el.clientWidth
      const h = el.clientHeight

      // адаптивні карти
      this.cw = Math.round(Math.min(120, w * 0.28))
      this.ch = Math.round(this.cw * 1.55)

      this.center = { x: w / 2, y: h / 2 }
      this.rOuter = Math.min(w, h) * this.radiusFactor

      const cards = this.$refs.cards || []
      cards.forEach((el) => {
        el.style.width  = this.cw + 'px'
        el.style.height = this.ch + 'px'
        el.style.left   = this.center.x + 'px'
        el.style.top    = this.center.y + 'px'
        el.style.transform = 'translate(-50%,-50%)'
      })
    },

    // розрахунок позиції та кута карти на колі
    circleXY (i, count, arc = this.arc, spread = this.spread) {
      // ефективний крок із урахуванням розрідження
      const step = count > 1 ? (arc / ((count - 1) * spread)) : 0
      // центроване віяло навколо верху
      const half = (step * (count - 1)) / 2
      const degFromTop = -half + i * step
      const rad = (degFromTop - 90) * Math.PI / 180

      return {
        x: this.center.x + this.rOuter * Math.cos(rad),
        y: this.center.y + this.rOuter * Math.sin(rad),
        deg: degFromTop
      }
    },

    // початкова поява: стопка -> невеликий хаос -> віяло
    intro () {
      const cards = this.$refs.cards || []
      if (!cards.length) return
      this.isBusy = true
      this.selectedIndex = null
      this.tl && this.tl.kill()

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      // стопка в центрі
      tl.set(cards, {
        xPercent: -50, yPercent: -50,
        left: this.center.x, top: this.center.y,
        rotation: i => (i % 7 - 3) * 3,
        zIndex: i => i,
        boxShadow: '0 6px 28px rgba(0,0,0,.24)'
      })

      // легкий хаос
      tl.to(cards, {
        duration: 0.2,
        x: () => (Math.random() - .5) * 26,
        y: () => (Math.random() - .5) * 22,
        rotation: () => (Math.random() - .5) * 16,
        stagger: { each: 0.012, from: 'random' }
      })

      // віяло (розріджене)
      tl.add(this._fanTween(cards), '>-0.05')
      tl.call(() => { this.isBusy = false })
      this.tl = tl
    },

    // tween для віяла
    _fanTween (cards, arc = this.arc, spread = this.spread) {
      return gsap.to(cards, {
        duration: 0.65,
        x: (i) => this.circleXY(i, cards.length, arc, spread).x - this.center.x,
        y: (i) => this.circleXY(i, cards.length, arc, spread).y - this.center.y,
        rotation: (i) => this.circleXY(i, cards.length, arc, spread).deg + (Math.random() - .5) * 1.5,
        zIndex: (i) => 20 + i,
        stagger: { each: 0.02, from: 'center' }
      })
    },

    // публічно: просто знову викласти віялом (якщо щось збилось)
    fanOut (animateFromStack = false) {
      if (this.isBusy) return
      const cards = this.$refs.cards || []
      if (!cards.length) return

      this.isBusy = true
      this.selectedIndex = null
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      if (animateFromStack) {
        // спочатку скласти в стопку
        tl.to(cards, {
          duration: 0.25,
          x: 0, y: 0,
          rotation: i => (i % 7 - 3) * 3,
          zIndex: i => i
        })
      }

      // випадковий невеликий зсув дуги, щоб виглядало “живіше”
      const deltaArc = (Math.random() * 20) - 10
      const arc = Math.min(340, Math.max(280, this.arc + deltaArc))
      const spread = this.spread

      tl.add(this._fanTween(cards, arc, spread), animateFromStack ? '>-0.02' : 0)
      tl.call(() => { this.isBusy = false })
    },

    // реалістичніше перемішування (riffle)
    riffleShuffle () {
      if (this.isBusy) return
      const cards = this.$refs.cards || []
      if (!cards.length) return

      this.isBusy = true
      this.selectedIndex = null

      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })

      // 1) зібрати в стопку
      tl.to(cards, {
        duration: 0.25,
        x: 0, y: 0,
        rotation: i => (i % 7 - 3) * 3,
        zIndex: i => i
      })

      // 2) розділити на дві стопки (ліва/права)
      const mid = Math.floor(cards.length / 2)
      const left  = cards.slice(0, mid)
      const right = cards.slice(mid)

      tl.to(left,  {
        duration: 0.25,
        x: -this.cw * 0.9,  y: -this.ch * 0.2,
        rotation: -6,       zIndex: 100
      }, 0)
      tl.to(right, {
        duration: 0.25,
        x:  this.cw * 0.9,  y: -this.ch * 0.2,
        rotation:  6,       zIndex: 100
      }, 0)

      // 3) підсипання (інтерлівінг) — крапельки карт по черзі
      const interleaved = []
      const l = [...left]
      const r = [...right]
      while (l.length || r.length) {
        if (Math.random() > .5 && l.length) interleaved.push(l.shift())
        if (r.length) interleaved.push(r.shift())
        if (l.length) interleaved.push(l.shift())
      }

      tl.to(interleaved, {
        duration: 0.35,
        x: () => (Math.random() - .5) * 22,
        y: (i) => (i % 3 === 0 ? 8 : -8) + (Math.random() - .5) * 8,
        rotation: () => (Math.random() - .5) * 10,
        zIndex: (i) => 100 + i,
        stagger: { each: 0.02, from: 0 }
      }, '>-0.02')

      // 4) рівняємо стопку
      tl.to(cards, {
        duration: 0.25,
        x: 0, y: 0,
        rotation: (i) => (i % 7 - 3) * 2.5,
        zIndex: (i) => i
      }, '>-0.02')

      // 5) викладаємо у нове віяло (з невеличким випадковим зсувом дуги)
      const deltaArc = (Math.random() * 24) - 12
      const arc = Math.min(340, Math.max(280, this.arc + deltaArc))
      const spread = this.spread

      tl.add(this._fanTween(cards, arc, spread), '>-0.02')
      tl.call(() => { this.isBusy = false })
    },

    onCardClick (i) {
      if (this.isBusy) return

      if (this.selectedIndex === i) {
        // назад у віяло
        this.selectedIndex = null
        const el = this.$refs.cards[i]
        const p = this.circleXY(i, this.deck.length)
        gsap.to(el, {
          duration: 0.45, ease: 'power3.out',
          x: p.x - this.center.x,
          y: p.y - this.center.y,
          rotation: p.deg,
          scale: 1,
          zIndex: 20 + i,
          boxShadow: '0 6px 28px rgba(0,0,0,.24)'
        })
        return
      }

      // вибір — в центр
      this.selectedIndex = i
      const el = this.$refs.cards[i]

      ;(this.$refs.cards || []).forEach((other, idx) => {
        if (idx === i) return
        const p = this.circleXY(idx, this.deck.length)
        gsap.to(other, {
          duration: 0.35, ease: 'power2.out',
          x: p.x - this.center.x,
          y: p.y - this.center.y,
          rotation: p.deg,
          scale: 1,
          zIndex: 20 + idx,
          boxShadow: '0 6px 28px rgba(0,0,0,.24)'
        })
      })

      gsap.to(el, {
        duration: 0.5, ease: 'power3.out',
        x: 0, y: -this.ch * 0.35,
        rotation: 0,
        scale: 1.12,
        zIndex: 999,
        boxShadow: '0 18px 60px rgba(20,40,120,.35)'
      })
    }
  }
}
</script>

<style scoped>
.deck-stage{
  position: relative;
  height: 72vh;
  border-radius: 16px;
  overflow: hidden;
  background: radial-gradient(160% 120% at 50% 10%, #1f2230 0%, #111320 55%, #0b0d16 100%);
}

/* карта */
.card{
  position: absolute;
  width: 110px;
  height: 170px;
  transform: translate(-50%,-50%);
  border-radius: 14px;
  background: #fff;
  border: 2px solid rgba(15,17,28,.12);
  cursor: pointer;
  will-change: transform;
  user-select: none;
  box-shadow: 0 6px 28px rgba(0,0,0,.24);
}

.face{
  width: 100%; height: 100%;
  padding: 12px;
  border-radius: 12px;
  background: linear-gradient(180deg,#ffffff,#f7f9ff);
  display: flex; flex-direction: column; gap: 8px;
}

.title{
  font-weight: 800;
  font-size: 16px;
  letter-spacing: .3px;
}
.text{
  font-size: 13px; line-height: 1.35; opacity: .84;
  overflow: hidden; display: -webkit-box;
  -webkit-line-clamp: 5; -webkit-box-orient: vertical;
}

.hint{
  position: absolute;
  left: 50%; transform: translateX(-50%);
  bottom: 64px;
  font-size: 12px; color: #e7e9ff; opacity: .7;
}

.controls{
  position: absolute;
  left: 50%; transform: translateX(-50%);
  bottom: 14px; display: flex; gap: 10px;
}
.btn{
  height: 40px; padding: 0 16px;
  border-radius: 10px;
  border: 1px solid rgba(145,160,255,.35);
  color: #e7eaff;
  background: linear-gradient(180deg, rgba(56,68,140,.55), rgba(36,44,96,.55));
  box-shadow: 0 6px 24px rgba(20,30,90,.35) inset, 0 8px 24px rgba(0,0,0,.25);
  backdrop-filter: blur(6px) saturate(115%);
  -webkit-backdrop-filter: blur(6px) saturate(115%);
  cursor: pointer;
}
.btn.ghost{
  background: rgba(32,38,88,.28);
}
.btn:disabled{ opacity:.6; cursor: default; }
</style>
