const STORAGE_KEY = 'dots-boxes-session'

export interface StoredSession {
  code: string
  name: string
  intent: 'create' | 'join'
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSession
    if (!parsed.code || !parsed.name) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSession(session: StoredSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY)
}
