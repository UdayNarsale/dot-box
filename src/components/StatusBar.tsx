import { useState } from 'react'
import { BrandMark } from './BrandMark'
import { ConfirmDialog } from './ConfirmDialog'
import { GameSettingsMenu } from './GameSettingsMenu'
import type { PlayerCardData } from './PlayerCard'

export type StatusPlayer = PlayerCardData

interface StatusBarProps {
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
  /** When true, show "…" instead of 0s while the turn skip syncs. */
  timerPending?: boolean
}

export function StatusBar({
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
  timerPending = false,
}: StatusBarProps) {
  const [confirm, setConfirm] = useState<'leave' | 'restart' | null>(null)

  return (
    <>
      <header className="w-full max-w-3xl mx-auto px-3 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandMark className="size-9 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--color-ink)]">
                Dots & Boxes
              </h1>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {timerSeconds !== null && timerSeconds !== undefined && (
              <div
                className={`rounded-lg px-3 py-2 text-sm font-semibold tabular-nums border transition-colors ${
                  timerUrgent
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                    : timerPending
                      ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                      : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
                aria-live="polite"
                title="Time left this turn"
              >
                {timerPending ? '…' : `${timerSeconds}s`}
              </div>
            )}
            {(onLeave || onRestart) && (
              <GameSettingsMenu
                onLeave={onLeave ? () => setConfirm('leave') : undefined}
                onRestart={onRestart ? () => setConfirm('restart') : undefined}
                leaveLabel={leaveLabel}
                restartLabel={restartLabel}
              />
            )}
          </div>
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
