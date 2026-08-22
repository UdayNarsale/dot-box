import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

const SPARK_COLORS = ['#ff3b3b', '#ffd700', '#ff8c00', '#fff44f', '#5cff5c', '#ff6ec7', '#ffffff', '#60a5fa']

/** Procedural firecracker bursts behind the winner modal — no external assets. */
export function WinCelebration() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width = w
    canvas.height = h

    const particles: Particle[] = []

    const burst = (x: number, y: number, count = 52) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6
        const speed = 2.5 + Math.random() * 7
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          life: 0,
          maxLife: 45 + Math.random() * 55,
          color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)]!,
          size: 2 + Math.random() * 3.5,
        })
      }
    }

    burst(w * 0.5, h * 0.32, 64)
    const timers = [
      window.setTimeout(() => burst(w * 0.22, h * 0.48, 44), 180),
      window.setTimeout(() => burst(w * 0.78, h * 0.42, 44), 360),
      window.setTimeout(() => burst(w * 0.5, h * 0.52, 56), 620),
      window.setTimeout(() => burst(w * 0.32, h * 0.28, 38), 900),
      window.setTimeout(() => burst(w * 0.68, h * 0.36, 38), 1100),
      window.setTimeout(() => burst(w * 0.5, h * 0.4, 48), 1400),
    ]

    let frame = 0
    let raf = 0

    const loop = () => {
      frame++
      ctx.clearRect(0, 0, w, h)

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!
        p.life++
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.11
        p.vx *= 0.985

        const alpha = 1 - p.life / p.maxLife
        if (alpha <= 0) {
          particles.splice(i, 1)
          continue
        }

        ctx.globalAlpha = alpha
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()

        if (p.life < 8) {
          ctx.globalAlpha = alpha * 0.35
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.globalAlpha = 1
      if (frame < 320 || particles.length > 0) {
        raf = requestAnimationFrame(loop)
      }
    }

    raf = requestAnimationFrame(loop)

    const onResize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w
      canvas.height = h
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      timers.forEach((id) => window.clearTimeout(id))
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 z-40 pointer-events-none" aria-hidden />
}
