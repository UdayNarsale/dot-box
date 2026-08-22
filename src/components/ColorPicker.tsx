import { PLAYER_COLORS } from '../types/game'

interface ColorPickerProps {
  value: number
  /** colorIndex → seat label (e.g. P1, P2) for colors taken by other players */
  takenBy: Record<number, string>
  onChange: (colorIndex: number) => void
  disabled?: boolean
  label?: string
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden fill="none">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ColorPicker({ value, takenBy, onChange, disabled, label }: ColorPickerProps) {
  const current = PLAYER_COLORS[value % PLAYER_COLORS.length]!

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-gradient-to-b from-slate-50/90 to-white dark:from-slate-800/90 dark:to-slate-900 p-3 sm:p-3.5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          {label && <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>}
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            Selected:{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300" style={{ color: current.stroke }}>
              {current.name}
            </span>
          </p>
        </div>
        <span
          className="shrink-0 size-8 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200"
          style={{ background: current.stroke }}
          title={current.name}
          aria-hidden
        />
      </div>

      <div
        className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-1.5 max-h-[11.5rem] sm:max-h-none overflow-y-auto sm:overflow-visible pr-0.5 sm:pr-0"
        role="radiogroup"
        aria-label={label ?? 'Choose a color'}
      >
        {PLAYER_COLORS.map((color) => {
          const takenLabel = takenBy[color.id]
          const isTaken = takenLabel !== undefined && color.id !== value
          const selected = color.id === value

          return (
            <button
              key={color.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={
                isTaken ? `${color.name}, taken by ${takenLabel}` : color.name
              }
              title={isTaken ? `${color.name} · ${takenLabel}` : color.name}
              disabled={disabled || isTaken}
              onClick={() => onChange(color.id)}
              className={`group relative aspect-square w-full max-w-[2.75rem] sm:max-w-[2.25rem] mx-auto rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed ${
                selected
                  ? 'scale-105 z-[1]'
                  : isTaken
                    ? 'cursor-not-allowed'
                    : 'cursor-pointer hover:scale-105 active:scale-95'
              }`}
            >
              <span
                className={`absolute inset-0 rounded-full border-2 shadow-sm transition-shadow ${
                  selected
                    ? 'border-[var(--color-ink)] shadow-md'
                    : 'border-white group-hover:shadow-md'
                }`}
                style={{ background: color.stroke }}
              />

              {selected && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20 text-white">
                  <CheckIcon />
                </span>
              )}

              {isTaken && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <span className="text-[10px] sm:text-[9px] font-bold leading-none tracking-tight text-white drop-shadow-sm">
                    {takenLabel}
                  </span>
                </span>
              )}

              {!selected && !isTaken && (
                <span className="sr-only">{color.name}</span>
              )}
            </button>
          )
        })}
      </div>

      <p className="mt-2.5 text-[10px] leading-snug text-slate-400">
        Tap an open color · labels show who picked taken ones
      </p>
    </div>
  )
}

export function firstFreeColor(taken: number[]): number {
  const used = new Set(taken)
  const free = PLAYER_COLORS.find((c) => !used.has(c.id))
  return free?.id ?? 0
}

/** Build takenBy map from seat index + color pairs (excluding current player). */
export function colorsTakenBy(
  seats: Array<{ colorIndex: number; seatIndex: number }>,
): Record<number, string> {
  const out: Record<number, string> = {}
  for (const { colorIndex, seatIndex } of seats) {
    out[colorIndex] = `P${seatIndex + 1}`
  }
  return out
}
