interface MenuProps {
  firebaseReady: boolean
  onLocal: () => void
  onCreate: () => void
  onJoin: () => void
}

export function Menu({ firebaseReady, onLocal, onCreate, onJoin }: MenuProps) {
  return (
    <main className="min-h-full flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md">
        <p className="text-sm font-medium tracking-wide text-slate-500 uppercase">Classic grid game</p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-semibold tracking-tight text-[var(--color-ink)]">
          Dots & Boxes
        </h1>
        <p className="mt-3 text-slate-600 leading-relaxed">
          Claim boxes by drawing lines. 2–8 players, grids from 5×5 to 16×16 dots. Local pass & play or
          online lobby with a shareable code.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={onLocal}
            className="rounded-2xl bg-[var(--color-ink)] text-white py-3.5 text-base font-medium hover:opacity-90 transition"
          >
            Local Pass & Play
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={!firebaseReady}
            className="rounded-2xl bg-white border border-slate-200 py-3.5 text-base font-medium hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Online Lobby
          </button>
          <button
            type="button"
            onClick={onJoin}
            disabled={!firebaseReady}
            className="rounded-2xl bg-white border border-slate-200 py-3.5 text-base font-medium hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join with Code
          </button>
        </div>

        {!firebaseReady && (
          <p className="mt-4 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            Online lobbies need Firebase env vars (`VITE_FIREBASE_*`). Local play works without them.
          </p>
        )}
      </div>
    </main>
  )
}
