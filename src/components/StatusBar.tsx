import { useState } from 'react'
import { BrandMark } from './BrandMark'
import { ConfirmDialog } from './ConfirmDialog'
import { GameSettingsMenu } from './GameSettingsMenu'
import type { PlayerCardData } from './PlayerCard'

export type StatusPlayer = PlayerCardData

interface StatusBarProps {
  onRestart?: () => void
  onLeave?: () => void
  onBackToLobby?: () => void
  restartLabel?: string
  backToLobbyLabel?: string
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
  /** When set (5…1), shows a large urgent count in the timer badge. */
  countdownSec?: number | null
}

export function StatusBar({
  onRestart,
  onLeave,
  onBackToLobby,
  restartLabel = 'Restart',
  backToLobbyLabel = 'Back to lobby',
  leaveLabel = 'Leave',
  subtitle,
  leaveConfirmTitle,
  leaveConfirmDetail,
  restartConfirmTitle,
  restartConfirmDetail,
  timerSeconds = null,
  timerUrgent = false,
  timerPending = false,
  countdownSec = null,
}: StatusBarProps) {
  const [confirm, setConfirm] = useState<'leave' | 'restart' | null>(null)

  return (
    <>
      <header className="w-full max-w-3xl mx-auto px-3 sm:px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BrandMark className="size-8 sm:size-9 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-semibold tracking-tight text-[var(--color-ink)] truncate">
                Dots & Boxes
              </h1>
              {subtitle && (
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {timerSeconds !== null && timerSeconds !== undefined && (
              <div
                className={`rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold tabular-nums border transition-colors min-w-[3.25rem] sm:min-w-[3.5rem] text-center ${
                  countdownSec !== null && countdownSec > 0
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                    : timerUrgent
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                    : timerPending
                      ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                      : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
                aria-live="assertive"
                title="Time left this turn"
              >
                {countdownSec !== null && countdownSec > 0 ? (
                  <span key={countdownSec} className="turn-countdown-badge inline-block tabular-nums">
                    {countdownSec}
                  </span>
                ) : timerPending ? (
                  '…'
                ) : (
                  `${timerSeconds}s`
                )}
              </div>
            )}
            {(onLeave || onRestart || onBackToLobby) && (
              <GameSettingsMenu
                onLeave={onLeave ? () => setConfirm('leave') : undefined}
                onRestart={onRestart ? () => setConfirm('restart') : undefined}
                onBackToLobby={onBackToLobby}
                leaveLabel={leaveLabel}
                restartLabel={restartLabel}
                backToLobbyLabel={backToLobbyLabel}
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
