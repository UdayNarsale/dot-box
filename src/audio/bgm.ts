/**
 * Original procedural background music — Web Audio synth only, no samples or licensed tracks.
 * Ambient (calm) for menu/lobby; three intensity phases during gameplay.
 */

import { isMusicEnabled, subscribeGamePreferences } from '../preferences/gamePreferences'
import { getAudioContext, getBgmDestination, onAudioUnlocked, resumeAudioContext } from './context'

export type MusicPhase = 'smooth' | 'intense' | 'peak'
type BgmTarget = 'ambient' | MusicPhase

/** Edges on a dots×dots grid (each line is one move). */
export function totalEdgeCount(dots: number): number {
  const d = Math.max(2, Math.floor(dots))
  return 2 * d * (d - 1)
}

/** Map board fill to music phase. */
export function computeMusicPhase(game: {
  dots: number
  moveCount: number
  finished: boolean
}): MusicPhase | null {
  if (game.finished) return null
  const total = totalEdgeCount(game.dots)
  if (total <= 0) return 'smooth'
  const progress = game.moveCount / total
  if (progress < 0.38) return 'smooth'
  if (progress < 0.72) return 'intense'
  return 'peak'
}

interface PhaseMix {
  bpm: number
  master: number
  pad: number
  arp: number
  bass: number
  pulse: number
  filterHz: number
}

/** Old 100% slider ≈ new 25%; boost music only (SFX unchanged). */
const MUSIC_LOUDNESS_BOOST = 4

function scaleMusicMix(mix: PhaseMix): PhaseMix {
  return {
    ...mix,
    master: mix.master * MUSIC_LOUDNESS_BOOST,
    pad: mix.pad * MUSIC_LOUDNESS_BOOST,
    arp: mix.arp * MUSIC_LOUDNESS_BOOST,
    bass: mix.bass * MUSIC_LOUDNESS_BOOST,
    pulse: mix.pulse * MUSIC_LOUDNESS_BOOST,
  }
}

/** Calm menu / lobby — softer than in-game smooth. */
const AMBIENT_MIX: PhaseMix = scaleMusicMix({
  bpm: 64,
  master: 0.12,
  pad: 0.042,
  arp: 0.024,
  bass: 0,
  pulse: 0,
  filterHz: 780,
})

const PHASE_MIX: Record<MusicPhase, PhaseMix> = {
  smooth: scaleMusicMix({ bpm: 70, master: 0.11, pad: 0.045, arp: 0.028, bass: 0, pulse: 0, filterHz: 900 }),
  intense: scaleMusicMix({ bpm: 92, master: 0.15, pad: 0.05, arp: 0.042, bass: 0.038, pulse: 0.012, filterHz: 1400 }),
  peak: scaleMusicMix({ bpm: 118, master: 0.19, pad: 0.055, arp: 0.05, bass: 0.052, pulse: 0.028, filterHz: 2200 }),
}

function mixForTarget(target: BgmTarget): PhaseMix {
  if (target === 'ambient') return AMBIENT_MIX
  return PHASE_MIX[target]
}

/** Am → F → C → G (root, third, fifth) */
const CHORDS: [number, number, number][] = [
  [220, 261.63, 329.63],
  [174.61, 220, 261.63],
  [261.63, 329.63, 392],
  [196, 246.94, 293.66],
]

const ARP_DEGREES = [0, 2, 1, 2, 0, 1, 2, 1]

class BgmEngine {
  private master: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  private target: BgmTarget = 'ambient'
  private blendStart = 0
  private blendFrom: PhaseMix = AMBIENT_MIX
  private nextBeatTime = 0
  private beat = 0
  private chordStep = 0
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false
  private noiseBuffer: AudioBuffer | null = null

  private ctx(): AudioContext | null {
    return getAudioContext()
  }

  private lerpMix(): PhaseMix {
    const c = this.ctx()
    if (!c) return mixForTarget(this.target)
    const elapsed = c.currentTime - this.blendStart
    const t = Math.min(1, elapsed / 2.2)
    const ease = t * t * (3 - 2 * t)
    const from = this.blendFrom
    const to = mixForTarget(this.target)
    return {
      bpm: from.bpm + (to.bpm - from.bpm) * ease,
      master: from.master + (to.master - from.master) * ease,
      pad: from.pad + (to.pad - from.pad) * ease,
      arp: from.arp + (to.arp - from.arp) * ease,
      bass: from.bass + (to.bass - from.bass) * ease,
      pulse: from.pulse + (to.pulse - from.pulse) * ease,
      filterHz: from.filterHz + (to.filterHz - from.filterHz) * ease,
    }
  }

  private ensureNoise(c: AudioContext) {
    if (this.noiseBuffer) return
    const len = Math.floor(c.sampleRate * 0.04)
    const buf = c.createBuffer(1, len, c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    this.noiseBuffer = buf
  }

  private playTone(
    freq: number,
    when: number,
    duration: number,
    type: OscillatorType,
    gain: number,
  ) {
    const c = this.ctx()
    if (!c || !this.master || !this.filter || gain <= 0.0001) return
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, when)
    g.gain.setValueAtTime(0.0001, when)
    g.gain.exponentialRampToValueAtTime(gain, when + 0.018)
    g.gain.exponentialRampToValueAtTime(0.0001, when + duration)
    osc.connect(g)
    g.connect(this.filter)
    osc.start(when)
    osc.stop(when + duration + 0.04)
  }

  private playPulse(when: number, gain: number) {
    const c = this.ctx()
    if (!c || !this.master || !this.filter || gain <= 0.0001) return
    this.ensureNoise(c)
    if (!this.noiseBuffer) return
    const src = c.createBufferSource()
    src.buffer = this.noiseBuffer
    const g = c.createGain()
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 6200
    bp.Q.value = 0.9
    g.gain.setValueAtTime(0.0001, when)
    g.gain.exponentialRampToValueAtTime(gain, when + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.045)
    src.connect(bp)
    bp.connect(g)
    g.connect(this.filter)
    src.start(when)
    src.stop(when + 0.06)
  }

  private scheduleBeat(when: number, mix: PhaseMix) {
    const chord = CHORDS[this.chordStep % CHORDS.length]!
    const beatInBar = this.beat % 4

    if (beatInBar === 0) {
      this.playTone(chord[0], when, 1.9, 'sine', mix.pad)
      this.playTone(chord[1], when + 0.01, 1.9, 'triangle', mix.pad * 0.65)
    }

    const arpIdx = ARP_DEGREES[this.beat % ARP_DEGREES.length] ?? 0
    const arpFreq = chord[arpIdx]! * (this.beat % 16 >= 8 ? 2 : 1)
    this.playTone(arpFreq, when + 0.02, 0.16, 'triangle', mix.arp)

    if (mix.bass > 0 && (beatInBar === 0 || beatInBar === 2)) {
      this.playTone(chord[0]! * 0.5, when, 0.34, 'sawtooth', mix.bass)
    }

    if (mix.pulse > 0) {
      const everyBeat = this.target === 'peak' || mix.pulse >= 0.02
      if (everyBeat || beatInBar % 2 === 0) {
        this.playPulse(when, mix.pulse)
      }
    }

    this.beat++
    if (this.beat % 8 === 0) this.chordStep++
  }

  private tick() {
    const c = this.ctx()
    if (!c || !this.master || !this.filter || !this.running) return

    const mix = this.lerpMix()

    this.master.gain.setTargetAtTime(mix.master, c.currentTime, 0.08)
    this.filter.frequency.setTargetAtTime(mix.filterHz, c.currentTime, 0.12)

    const beatDur = 60 / mix.bpm
    const horizon = c.currentTime + 0.18

    while (this.nextBeatTime < horizon) {
      this.scheduleBeat(this.nextBeatTime, mix)
      this.nextBeatTime += beatDur
    }
  }

  private setTarget(target: BgmTarget) {
    if (target === this.target) return
    const c = this.ctx()
    if (!c) return
    this.blendFrom = this.lerpMix()
    this.blendStart = c.currentTime
    this.target = target
  }

  async ensurePlaying(target: BgmTarget) {
    if (!isMusicEnabled()) return
    const c = await resumeAudioContext()
    if (!c || c.state !== 'running') return

    if (this.running) {
      this.setTarget(target)
      return
    }

    this.master = c.createGain()
    this.filter = c.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.filter.Q.value = 0.6
    this.master.gain.setValueAtTime(0.0001, c.currentTime)
    this.filter.connect(this.master)
    const dest = getBgmDestination()
    if (!dest) return
    this.master.connect(dest)

    this.target = target
    this.blendFrom = mixForTarget(target)
    this.blendStart = c.currentTime
    this.beat = 0
    this.chordStep = 0
    this.nextBeatTime = c.currentTime + 0.06
    this.running = true

    this.master.gain.exponentialRampToValueAtTime(
      mixForTarget(target).master,
      c.currentTime + 1.2,
    )

    this.timer = setInterval(() => this.tick(), 40)
    this.tick()
  }

  stop() {
    this.running = false
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
    const c = this.ctx()
    if (c && this.master) {
      const g = this.master
      const t = c.currentTime
      g.gain.cancelScheduledValues(t)
      g.gain.setValueAtTime(g.gain.value, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
      window.setTimeout(() => {
        try {
          g.disconnect()
          this.filter?.disconnect()
        } catch {
          /* ignore */
        }
      }, 650)
    }
    this.master = null
    this.filter = null
  }
}

let engine: BgmEngine | null = null

function getEngine(): BgmEngine {
  if (!engine) engine = new BgmEngine()
  return engine
}

let ambientRequested = false
let gameRequested = false
let gameSnapshot: { dots: number; moveCount: number; finished: boolean } | null = null
let ambientOffTimer: ReturnType<typeof setTimeout> | null = null

function syncBgm() {
  if (!isMusicEnabled()) {
    getEngine().stop()
    return
  }

  if (gameRequested && gameSnapshot && !gameSnapshot.finished) {
    const phase = computeMusicPhase(gameSnapshot) ?? 'smooth'
    void getEngine().ensurePlaying(phase)
    return
  }

  if (ambientRequested) {
    void getEngine().ensurePlaying('ambient')
    return
  }

  getEngine().stop()
}

/** Calm music for home screen, lobby, and setup. */
export function requestAmbientBgm(on: boolean): void {
  if (on) {
    if (ambientOffTimer !== null) {
      window.clearTimeout(ambientOffTimer)
      ambientOffTimer = null
    }
    ambientRequested = true
    syncBgm()
    return
  }

  if (ambientOffTimer !== null) window.clearTimeout(ambientOffTimer)
  ambientOffTimer = window.setTimeout(() => {
    ambientOffTimer = null
    ambientRequested = false
    syncBgm()
  }, 100)
}

/** Phased in-game music; takes priority over ambient while active. */
export function requestGameBgm(
  on: boolean,
  game?: { dots: number; moveCount: number; finished: boolean } | null,
): void {
  gameRequested = on
  gameSnapshot = on && game ? game : null
  syncBgm()
}

export function stopBgm(): void {
  ambientRequested = false
  gameRequested = false
  gameSnapshot = null
  getEngine().stop()
}

subscribeGamePreferences(() => syncBgm())

onAudioUnlocked(() => syncBgm())
