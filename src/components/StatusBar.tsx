import { useState } from 'react'
import { PLAYER_COLORS } from '../types/game'
import { ConfirmDialog } from './ConfirmDialog'

interface StatusPlayer {
  name: string
  colorIndex: number
  score: number
  active: boolean
  isYou?: boolean
}

interface StatusBarProps {
  players: StatusPlayer[]
  onRestart?: () => void
  onLeave?: () => void
  restartLabel?: string
  leaveLabel?: string
  subtitle?: string
  leaveConfirmTitle?: string
  leaveConfirmDetail?: string
  restartConfirmTitle?: string
  restartConfirmDetail?: string
  /** Seconds left on the active turn clock; null/undefined hides the badge. */
  timerSeconds?: number | null
  timerUrgent?: boolean
}

export function StatusBar({
  players,
  onRestart,
  onLeave,
  restartLabel = 'Restart',
  leaveLabel = 'Leave',
  subtitle,
  leaveConfirmTitle,
  leaveConfirmDetail,
  restartConfirmTitle,
  restartConfirmDetail,
  timerSeconds = null,
  timerUrgent = false,
}: StatusBarProps) {
  const [confirm, setConfirm] = useState<'leave' | 'restart' | null>(null)

  return (
    <>
      <header className="w-full max-w-3xl mx-auto px-3 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--color-ink)]">
              Dots & Boxes
            </h1>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {timerSeconds !== null && timerSeconds !== undefined && (
              <div
                className={`rounded-lg px-3 py-2 text-sm font-semibold tabular-nums border transition-colors ${
                  timerUrgent
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-white/80 border-slate-200 text-slate-700'
                }`}
                aria-live="polite"
                title="Time left this turn"
              >
                {timerSeconds}s
              </div>
            )}
            {onLeave && (
              <button
                type="button"
                onClick={() => setConfirm('leave')}
                className="rounded-lg px-3 py-2 text-sm font-medium bg-white/70 border border-slate-200 hover:bg-white transition"
              >
                {leaveLabel}
              </button>
            )}
            {onRestart && (
              <button
                type="button"
                onClick={() => setConfirm('restart')}
                className="rounded-lg px-3 py-2 text-sm font-medium bg-[var(--color-ink)] text-white hover:opacity-90 transition"
              >
                {restartLabel}
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {players.map((p, i) => {
            const color = PLAYER_COLORS[p.colorIndex % PLAYER_COLORS.length]!
            return (
              <div
                key={`${p.name}-${i}`}
                className={`min-w-[7.5rem] flex-1 rounded-xl border px-3 py-2 backdrop-blur transition-[border-color,background-color] duration-300 ${
                  p.active ? 'animate-pulse-turn border-current' : 'bg-white/80 border-slate-200'
                }`}
                style={p.active ? { color: color.stroke } : undefined}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block size-2.5 rounded-full shrink-0"
                    style={{ background: color.stroke }}
                  />
                  <span className="text-xs font-medium text-slate-700 truncate">
                    {p.name}
                    {p.isYou ? ' (you)' : ''}
                  </span>
                </div>
                <div className="mt-1 text-xl font-semibold tabular-nums" style={{ color: color.stroke }}>
                  {p.score}
                </div>
                {p.active && (
                  <div className="animate-turn-label text-[10px] uppercase tracking-wide font-semibold">
                    Turn
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </header>

      <ConfirmDialog
        open={confirm === 'leave'}
        title={
          leaveConfirmTitle ??
          (leaveLabel === 'Menu' ? 'Return to menu?' : `${leaveLabel} game?`)
        }
        detail={
          leaveConfirmDetail ??
          (leaveLabel === 'Menu'
            ? 'The current game will end and scores will be lost.'
            : 'You will leave this lobby. You may not be able to rejoin if the game is in progress.')
        }
        confirmLabel={leaveLabel === 'Menu' ? 'Return to menu' : leaveLabel}
        cancelLabel="Stay"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null)
          onLeave?.()
        }}
      />

      <ConfirmDialog
        open={confirm === 'restart'}
        title={restartConfirmTitle ?? `Restart game?`}
        detail={
          restartConfirmDetail ??
          'All lines and scores will reset. This cannot be undone.'
        }
        confirmLabel={restartLabel}
        cancelLabel="Cancel"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null)
          onRestart?.()
        }}
      />
    </>
  )
}
