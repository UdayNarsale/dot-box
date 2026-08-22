import { useAmbientMusic } from '../hooks/useAmbientMusic'
import { SettingsPanel } from './SettingsPanel'
import { ScreenPage, ScreenScroll } from './ScreenLayout'

interface HomeSettingsProps {
  onBack: () => void
}

export function HomeSettings({ onBack }: HomeSettingsProps) {
  useAmbientMusic(true)

  return (
    <ScreenPage>
      <header className="shrink-0 w-full max-w-md mx-auto pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 px-4 py-2.5 text-sm font-medium hover:bg-white dark:hover:bg-slate-800 transition"
          >
            Back
          </button>
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">Settings</h1>
        </div>
      </header>

      <ScreenScroll className="max-w-md pb-4">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
          Audio, display, and streaming preferences. Saved on this device.
        </p>
        <SettingsPanel />
      </ScreenScroll>
    </ScreenPage>
  )
}
