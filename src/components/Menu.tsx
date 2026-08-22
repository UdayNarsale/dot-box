import { BrandMark } from './BrandMark'
import { useAmbientMusic } from '../hooks/useAmbientMusic'
import { unlockAudioFromGesture } from '../audio/context'
import { btnPrimary, btnSecondary, ScreenPage } from './ScreenLayout'

interface MenuProps {
  firebaseReady: boolean
  onLocal: () => void
  onCreate: () => void
  onJoin: () => void
  onSettings: () => void
}

export function Menu({ firebaseReady, onLocal, onCreate, onJoin, onSettings }: MenuProps) {
  useAmbientMusic(true)

  const tap =
    (fn: () => void) =>
    () => {
      unlockAudioFromGesture()
      fn()
    }

  return (
    <ScreenPage center className="py-6 sm:py-10">
      <div className="w-full max-w-md flex flex-col items-center text-center">
        <BrandMark className="size-[4.5rem] sm:size-24 shrink-0 drop-shadow-md mb-5 sm:mb-6" />
        <p className="text-xs sm:text-sm font-semibold tracking-[0.18em] sm:tracking-[0.2em] uppercase text-slate-500 dark:text-slate-400">
          Classic grid game
        </p>
        <h1 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight text-[var(--color-ink)]">
          Dots & Boxes
        </h1>
        <p className="mt-4 sm:mt-5 text-sm sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed px-1">
          Draw lines, claim boxes, outscore your friends. 2–8 players on grids from 5×5 to 16×16.
        </p>

        <div className="w-full flex flex-col gap-2.5 sm:gap-3 mt-7 sm:mt-8">
          <button type="button" onClick={tap(onLocal)} className={btnPrimary}>
            Local Pass & Play
          </button>
          <button type="button" onClick={tap(onCreate)} disabled={!firebaseReady} className={btnSecondary}>
            Create Online Lobby
          </button>
          <button type="button" onClick={tap(onJoin)} disabled={!firebaseReady} className={btnSecondary}>
            Join with Code
          </button>
          <button type="button" onClick={tap(onSettings)} className={btnSecondary}>
            Settings
          </button>

          {!firebaseReady && (
            <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-xl px-3 py-2.5 text-center">
              Online play needs Firebase env vars (`VITE_FIREBASE_*`). Local play works without them.
            </p>
          )}
        </div>
      </div>
    </ScreenPage>
  )
}
