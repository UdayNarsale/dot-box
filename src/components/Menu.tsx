import { BrandLockup } from './BrandMark'
import { GameSettingsMenu } from './GameSettingsMenu'

interface MenuProps {
  firebaseReady: boolean
  onLocal: () => void
  onCreate: () => void
  onJoin: () => void
}

export function Menu({ firebaseReady, onLocal, onCreate, onJoin }: MenuProps) {
  return (
    <main className="min-h-full flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md relative">
        <div className="absolute top-0 right-0">
          <GameSettingsMenu />
        </div>

        <BrandLockup />
        <p className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
          Claim boxes by drawing lines. 2–8 players, grids from 5×5 to 16×16 dots. Local pass & play or
          online lobby with a shareable code.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={onLocal}
            className="rounded-2xl bg-[var(--color-btn)] text-[var(--color-btn-fg)] py-3.5 text-base font-medium hover:opacity-90 transition"
          >
            Local Pass & Play
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={!firebaseReady}
            className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3.5 text-base font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Online Lobby
          </button>
          <button
            type="button"
            onClick={onJoin}
            disabled={!firebaseReady}
            className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3.5 text-base font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join with Code
          </button>
        </div>

        {!firebaseReady && (
          <p className="mt-4 text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-xl px-3 py-2">
            Online lobbies need Firebase env vars (`VITE_FIREBASE_*`). Local play works without them.
          </p>
        )}
      </div>
    </main>
  )
}
