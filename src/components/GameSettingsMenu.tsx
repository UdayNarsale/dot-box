import { useEffect, useRef, useState } from 'react'
import { SettingsPanel } from './SettingsPanel'

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
        aria-label="Game settings"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <SettingsIcon />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-2 px-1 animate-fade-in"
        >
          <SettingsPanel className="border-0 bg-transparent divide-y divide-slate-100 dark:divide-slate-800" />

          {(onRestart || onLeave) && (
            <div className="my-1 mx-2 border-t border-slate-100 dark:border-slate-800" />
          )}

          {onRestart && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onRestart()
              }}
              className="w-full mx-1 max-w-[calc(100%-0.5rem)] px-3 py-2.5 text-left text-sm font-medium text-[var(--color-ink)] hover:bg-slate-50 dark:hover:bg-slate-800 transition rounded-lg"
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
              className="w-full mx-1 max-w-[calc(100%-0.5rem)] px-3 py-2.5 text-left text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition rounded-lg"
            >
              {leaveLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
