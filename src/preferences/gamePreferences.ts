const MUSIC_KEY = 'dots-boxes-music'
const STREAMER_KEY = 'dots-boxes-streamer'
const DARK_KEY = 'dots-boxes-dark'
const VOLUME_KEY = 'dots-boxes-volume'

export const DEFAULT_MUSIC_VOLUME = 80

type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((fn) => fn())
}

export function subscribeGamePreferences(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isMusicEnabled(): boolean {
  try {
    return localStorage.getItem(MUSIC_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setMusicEnabled(on: boolean): void {
  localStorage.setItem(MUSIC_KEY, on ? 'on' : 'off')
  notify()
}

export function isStreamerMode(): boolean {
  try {
    return localStorage.getItem(STREAMER_KEY) === 'on'
  } catch {
    return false
  }
}

export function setStreamerMode(on: boolean): void {
  localStorage.setItem(STREAMER_KEY, on ? 'on' : 'off')
  notify()
}

export function isDarkMode(): boolean {
  try {
    return localStorage.getItem(DARK_KEY) === 'on'
  } catch {
    return false
  }
}

export function setDarkMode(on: boolean): void {
  localStorage.setItem(DARK_KEY, on ? 'on' : 'off')
  applyDarkModeClass(on)
  notify()
}

export function applyDarkModeClass(on?: boolean): void {
  if (typeof document === 'undefined') return
  const enabled = on ?? isDarkMode()
  document.documentElement.classList.toggle('dark', enabled)
}

export function getMusicVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY)
    if (raw == null) return DEFAULT_MUSIC_VOLUME
    const n = Number(raw)
    if (!Number.isFinite(n)) return DEFAULT_MUSIC_VOLUME
    return Math.min(100, Math.max(0, Math.round(n)))
  } catch {
    return DEFAULT_MUSIC_VOLUME
  }
}

export function setMusicVolume(percent: number): void {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)))
  localStorage.setItem(VOLUME_KEY, String(clamped))
  notify()
}

/** Linear 0–1 gain for the shared master output. */
export function getVolumeMultiplier(): number {
  return getMusicVolume() / 100
}
