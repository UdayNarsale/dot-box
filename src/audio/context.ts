/** Shared Web Audio context for SFX and procedural BGM. */

import { getVolumeMultiplier, subscribeGamePreferences } from '../preferences/gamePreferences'

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let bgmBusGain: GainNode | null = null
let unlocked = false
const unlockListeners = new Set<() => void>()

export function isAudioUnlocked(): boolean {
  return unlocked && getAudioContext()?.state === 'running'
}

export function onAudioUnlocked(listener: () => void): () => void {
  if (isAudioUnlocked()) listener()
  unlockListeners.add(listener)
  return () => unlockListeners.delete(listener)
}

function notifyUnlocked() {
  unlockListeners.forEach((fn) => fn())
}

export function getAudioContext(): AudioContext | null {
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

/** All game audio routes through this gain node (volume slider). */
export function getAudioDestination(): AudioNode | null {
  const c = getAudioContext()
  if (!c) return null
  if (!masterGain) {
    masterGain = c.createGain()
    masterGain.gain.value = getVolumeMultiplier()
    masterGain.connect(c.destination)
  }
  return masterGain
}

/** BGM routes through a separate bus so SFX can duck music without affecting clicks. */
export function getBgmDestination(): AudioNode | null {
  const c = getAudioContext()
  const master = getAudioDestination()
  if (!c || !master) return null
  if (!bgmBusGain) {
    bgmBusGain = c.createGain()
    bgmBusGain.gain.value = 1
    bgmBusGain.connect(master)
  }
  return bgmBusGain
}

/** Briefly lower BGM while a gameplay SFX plays so clicks/box chimes stay clear. */
export function duckBgmForSfx(
  depth = 0.28,
  attackSec = 0.025,
  holdSec = 0.1,
  releaseSec = 0.45,
): void {
  const c = getAudioContext()
  const bus = getBgmDestination()
  if (!c || !bus || !(bus instanceof GainNode)) return
  const t = c.currentTime
  const g = bus.gain
  g.cancelScheduledValues(t)
  g.setValueAtTime(g.value, t)
  g.linearRampToValueAtTime(depth, t + attackSec)
  g.linearRampToValueAtTime(1, t + attackSec + holdSec + releaseSec)
}

export function applyMasterVolume(): void {
  const c = getAudioContext()
  const dest = getAudioDestination()
  if (!c || !dest || !(dest instanceof GainNode)) return
  dest.gain.setTargetAtTime(getVolumeMultiplier(), c.currentTime, 0.06)
}

export async function resumeAudioContext(): Promise<AudioContext | null> {
  const c = getAudioContext()
  if (!c) return null
  getAudioDestination()
  if (c.state === 'suspended') {
    try {
      await c.resume()
    } catch {
      /* ignore */
    }
  }
  if (c.state === 'running') {
    if (!unlocked) {
      unlocked = true
      notifyUnlocked()
    }
  }
  return c
}

/** Browsers require a user gesture before audio plays — call from click/touch/key handlers. */
export function unlockAudioFromGesture(): void {
  void resumeAudioContext()
}

let listenersInstalled = false

/** One-time document listeners so the first tap anywhere unlocks audio. */
export function installAudioUnlockListeners(): void {
  if (listenersInstalled || typeof document === 'undefined') return
  listenersInstalled = true

  const onGesture = () => unlockAudioFromGesture()

  document.addEventListener('pointerdown', onGesture, true)
  document.addEventListener('keydown', onGesture, true)
  document.addEventListener('touchstart', onGesture, true)
}

subscribeGamePreferences(() => applyMasterVolume())
