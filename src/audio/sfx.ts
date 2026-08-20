/**
 * Original Web Audio synth SFX — no external samples / copyrighted assets.
 * Four gameplay cues only (plus optional win flourish kept separate).
 */

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

async function resume() {
  const c = getCtx()
  if (c && c.state === 'suspended') {
    try {
      await c.resume()
    } catch {
      /* ignore */
    }
  }
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.08,
  when = 0,
  slideTo?: number,
) {
  const c = getCtx()
  if (!c) return
  const t0 = c.currentTime + when
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration)
  }
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

/** 1 — Your line placement (bright short click-tick) */
export async function playSelfLine() {
  await resume()
  tone(660, 0.055, 'triangle', 0.07)
  tone(990, 0.04, 'sine', 0.035, 0.02)
}

/** 2 — Opponent line placement (softer, lower thud) */
export async function playOpponentLine() {
  await resume()
  tone(280, 0.08, 'sine', 0.055)
  tone(210, 0.06, 'triangle', 0.03, 0.025)
}

/** 3 — You completed a box (rising cheerful chime) */
export async function playSelfBox() {
  await resume()
  tone(523.25, 0.08, 'sine', 0.07)
  tone(659.25, 0.1, 'sine', 0.065, 0.07)
  tone(783.99, 0.12, 'triangle', 0.05, 0.14)
}

/** 4 — Opponent completed a box (descending muted ding) */
export async function playOpponentBox() {
  await resume()
  tone(440, 0.09, 'triangle', 0.055)
  tone(349.23, 0.11, 'sine', 0.05, 0.08)
  tone(293.66, 0.1, 'sine', 0.035, 0.16)
}

export async function playMoveSound(opts: {
  isSelf: boolean
  closedBoxes: boolean
}) {
  if (opts.closedBoxes) {
    if (opts.isSelf) await playSelfBox()
    else await playOpponentBox()
  } else if (opts.isSelf) {
    await playSelfLine()
  } else {
    await playOpponentLine()
  }
}

/** End-of-game flourish (original synth; not one of the four move cues). */
export async function playWinSound() {
  await resume()
  tone(523.25, 0.12, 'sine', 0.07)
  tone(659.25, 0.12, 'sine', 0.07, 0.1)
  tone(783.99, 0.18, 'sine', 0.08, 0.2)
}

/** @deprecated use playSelfLine / playMoveSound */
export const playLineSound = playSelfLine
/** @deprecated use playSelfBox / playMoveSound */
export const playBoxSound = playSelfBox
