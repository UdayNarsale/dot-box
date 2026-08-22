import { PLAYER_COLORS } from '../types/game'
import { WinCelebration } from './WinCelebration'

interface EndModalProps {
  open: boolean
  title: string
  detail: string
  winnerColorIndexes?: number[]
  primaryLabel: string
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary?: () => void
}

export function EndModal({
  open,
  title,
  detail,
  winnerColorIndexes = [],
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: EndModalProps) {
  if (!open) return null

  return (
    <>
      <WinCelebration />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-title"
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 max-h-[min(90dvh,640px)] overflow-y-auto"
      >
        <div className="flex gap-2 mb-3">
          {winnerColorIndexes.map((ci) => (
            <span
              key={ci}
              className="size-3 rounded-full"
              style={{ background: PLAYER_COLORS[ci % PLAYER_COLORS.length]!.stroke }}
            />
          ))}
        </div>
        <h2 id="end-title" className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{detail}</p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onPrimary}
            className="w-full rounded-xl bg-[var(--color-btn)] text-[var(--color-btn-fg)] py-3 font-medium hover:opacity-90 transition"
          >
            {primaryLabel}
          </button>
          {secondaryLabel && onSecondary && (
            <button
              type="button"
              onClick={onSecondary}
              className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 py-3 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
