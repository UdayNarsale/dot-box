import { useEffect, useRef, useState } from 'react'
import { useGamePreferences } from '../hooks/useGamePreferences'

function SettingsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden
    >
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}

interface ToggleRowProps {
  label: string
  hint?: string
  on: boolean
  onToggle: () => void
}

function ToggleRow({ label, hint, on, onToggle }: ToggleRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition rounded-lg"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
        {hint && (
          <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{hint}</span>
        )}
      </span>
      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
          on
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
        }`}
      >
        {on ? 'On' : 'Off'}
      </span>
    </button>
  )
}

interface GameSettingsMenuProps {
  onLeave?: () => void
  onRestart?: () => void
  leaveLabel?: string
  restartLabel?: string
}

export function GameSettingsMenu({
  onLeave,
  onRestart,
  leaveLabel = 'Leave',
  restartLabel = 'Play again',
}: GameSettingsMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const {
    musicEnabled,
    streamerMode,
    darkMode,
    setMusicEnabled,
    setStreamerMode,
    setDarkMode,
  } = useGamePreferences()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-2.5 bg-white/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-200"
        aria-label="Settings"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <SettingsIcon />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1 animate-fade-in"
        >
          <ToggleRow
            label="Music"
            hint="Background music and sound effects"
            on={musicEnabled}
            onToggle={() => setMusicEnabled(!musicEnabled)}
          />
          <ToggleRow
            label="Streamer mode"
            hint="Hide lobby code and names"
            on={streamerMode}
            onToggle={() => setStreamerMode(!streamerMode)}
          />
          <ToggleRow
            label="Dark mode"
            hint="Dark background and panels"
            on={darkMode}
            onToggle={() => setDarkMode(!darkMode)}
          />

          {(onRestart || onLeave) && (
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
          )}

          {onRestart && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onRestart()
              }}
              className="w-full px-3 py-2.5 text-left text-sm font-medium text-[var(--color-ink)] hover:bg-slate-50 dark:hover:bg-slate-800 transition rounded-lg"
            >
              {restartLabel}
            </button>
          )}

          {onLeave && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onLeave()
              }}
              className="w-full px-3 py-2.5 text-left text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition rounded-lg"
            >
              {leaveLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
