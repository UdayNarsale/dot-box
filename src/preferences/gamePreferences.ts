const MUSIC_KEY = 'dots-boxes-music'
const STREAMER_KEY = 'dots-boxes-streamer'
const DARK_KEY = 'dots-boxes-dark'

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
