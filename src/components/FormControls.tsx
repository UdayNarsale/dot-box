import { MAX_DOTS, MAX_PLAYERS, MIN_DOTS, MIN_PLAYERS } from '../types/game'

interface NumberSelectProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
  hint?: string
}

function NumberSelect({ label, value, min, max, onChange, hint }: NumberSelectProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {hint && <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{hint}</span>}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          className="size-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-700"
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-[var(--color-ink)]"
        />
        <span className="w-10 text-center tabular-nums font-semibold">{value}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          className="size-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-700"
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </button>
      </div>
    </label>
  )
}

export { NumberSelect, MIN_DOTS, MAX_DOTS, MIN_PLAYERS, MAX_PLAYERS }

interface TextFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
}

export function TextField({ label, value, onChange, placeholder, maxLength }: TextFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        type="text"
        value={value}
        maxLength={maxLength ?? 20}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-3 text-base sm:text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
      />
    </label>
  )
}
