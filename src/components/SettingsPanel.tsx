import { unlockAudioFromGesture } from '../audio/context'
import { useGamePreferences } from '../hooks/useGamePreferences'

interface ToggleRowProps {
  label: string
  hint?: string
  on: boolean
  onToggle: () => void
}

export function SettingsToggleRow({ label, hint, on, onToggle }: ToggleRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition rounded-xl"
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

interface VolumeRowProps {
  value: number
  disabled?: boolean
}

export function SettingsVolumeRow({ value, disabled }: VolumeRowProps) {
  const { setMusicVolume } = useGamePreferences()

  const step = (delta: number) => {
    unlockAudioFromGesture()
    setMusicVolume(value + delta)
  }

  return (
    <div className={`px-4 py-3.5 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">Volume</span>
        <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-400">
          {value}%
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Lower volume"
          disabled={disabled || value <= 0}
          onClick={() => step(-10)}
          className="size-9 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40"
        >
          −
        </button>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          disabled={disabled}
          aria-label="Volume"
          onChange={(e) => {
            unlockAudioFromGesture()
            setMusicVolume(Number(e.target.value))
          }}
          className="flex-1 accent-[var(--color-ink)] disabled:cursor-not-allowed"
        />
        <button
          type="button"
          aria-label="Raise volume"
          disabled={disabled || value >= 100}
          onClick={() => step(10)}
          className="size-9 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  )
}

interface SettingsPanelProps {
  className?: string
}

export function SettingsPanel({ className = '' }: SettingsPanelProps) {
  const {
    musicEnabled,
    musicVolume,
    streamerMode,
    darkMode,
    setMusicEnabled,
    setStreamerMode,
    setDarkMode,
  } = useGamePreferences()

  return (
    <div
      className={`rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm divide-y divide-slate-100 dark:divide-slate-800 ${className}`}
    >
      <SettingsToggleRow
        label="Music"
        hint="Background music and sound effects"
        on={musicEnabled}
        onToggle={() => setMusicEnabled(!musicEnabled)}
      />
      <SettingsVolumeRow value={musicVolume} />
      <SettingsToggleRow
        label="Streamer mode"
        hint="Hide lobby code and player names"
        on={streamerMode}
        onToggle={() => setStreamerMode(!streamerMode)}
      />
      <SettingsToggleRow
        label="Dark mode"
        hint="Dark background and panels"
        on={darkMode}
        onToggle={() => setDarkMode(!darkMode)}
      />
    </div>
  )
}
