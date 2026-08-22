import { useEffect, useState } from 'react'
import { MIN_TURN_SECONDS, TURN_TIMER_PRESETS } from '../types/game'
import { clampTurnSeconds } from '../engine/gameEngine'

export type TimerMode = 'off' | '10' | '30' | '45' | '60' | 'custom'

export function timerModeFromSeconds(seconds: number): TimerMode {
  if (!seconds || seconds <= 0) return 'off'
  if ((TURN_TIMER_PRESETS as readonly number[]).includes(seconds)) {
    return String(seconds) as TimerMode
  }
  return 'custom'
}

export function secondsFromTimerMode(mode: TimerMode, customSeconds: number): number {
  if (mode === 'off') return 0
  if (mode === 'custom') return clampTurnSeconds(customSeconds)
  return Number(mode)
}

interface TimerSelectProps {
  label?: string
  seconds: number
  onChange: (seconds: number) => void
  disabled?: boolean
  hint?: string
}

export function TimerSelect({
  label = 'Turn timer',
  seconds,
  onChange,
  disabled,
  hint = 'If time runs out, that player loses this turn and skips their next turn (no line is drawn).',
}: TimerSelectProps) {
  const mode = timerModeFromSeconds(seconds)
  const [customText, setCustomText] = useState(
    String(mode === 'custom' ? seconds : MIN_TURN_SECONDS),
  )

  useEffect(() => {
    if (mode === 'custom') setCustomText(String(seconds))
  }, [mode, seconds])

  return (
    <div className="block">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {hint && <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{hint}</span>}
      <select
        className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-3 text-base sm:text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 disabled:opacity-50"
        value={mode}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value as TimerMode
          if (next === 'custom') {
            const n = clampTurnSeconds(Number(customText) || MIN_TURN_SECONDS)
            setCustomText(String(n))
            onChange(n)
          } else {
            onChange(secondsFromTimerMode(next, MIN_TURN_SECONDS))
          }
        }}
      >
        <option value="off">Off</option>
        {TURN_TIMER_PRESETS.map((s) => (
          <option key={s} value={String(s)}>
            {s} seconds
          </option>
        ))}
        <option value="custom">Custom…</option>
      </select>

      {mode === 'custom' && (
        <label className="mt-3 block">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Custom seconds (min {MIN_TURN_SECONDS})
          </span>
          <input
            type="number"
            min={MIN_TURN_SECONDS}
            max={600}
            step={1}
            disabled={disabled}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onBlur={() => {
              const n = clampTurnSeconds(Number(customText) || MIN_TURN_SECONDS)
              setCustomText(String(n))
              onChange(n)
            }}
            className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 disabled:opacity-50"
          />
        </label>
      )}
    </div>
  )
}
