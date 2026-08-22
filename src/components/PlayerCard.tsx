import { PLAYER_COLORS } from '../types/game'

export interface PlayerCardData {
  id?: string
  name: string
  colorIndex: number
  score: number
  active: boolean
  isYou?: boolean
  skipNext?: boolean
}

interface PlayerCardProps {
  player: PlayerCardData
  compact?: boolean
}

export function PlayerCard({ player: p, compact = false }: PlayerCardProps) {
  const color = PLAYER_COLORS[p.colorIndex % PLAYER_COLORS.length]!

  if (compact) {
    return (
      <div
        className={`shrink-0 flex items-center gap-2 rounded-xl px-2.5 py-1.5 border ${
          p.active
            ? 'animate-pulse-turn border-[2px] border-current'
            : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
        }`}
        style={p.active ? { color: color.stroke } : undefined}
      >
        <span className="size-2 rounded-full shrink-0" style={{ background: color.stroke }} />
        <span
          className={`text-xs font-bold truncate max-w-[4.5rem] ${p.active ? '' : 'text-slate-800 dark:text-slate-200'}`}
          style={p.active ? { color: color.stroke } : undefined}
        >
          {p.name}
        </span>
        <span className="text-sm font-semibold tabular-nums" style={{ color: color.stroke }}>
          {p.score}
        </span>
        {p.active && (
          <span className="text-[9px] uppercase font-bold tracking-wide">Turn</span>
        )}
      </div>
    )
  }

  return (
    <div
      className={`w-[5.25rem] sm:w-[7rem] aspect-square shrink-0 rounded-xl p-1.5 sm:p-2 backdrop-blur flex flex-col items-center justify-center gap-0.5 text-center ${
        p.active
          ? 'animate-pulse-turn border-[3px] border-current'
          : 'bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700'
      }`}
      style={p.active ? { color: color.stroke } : undefined}
    >
      <div className="w-full min-w-0 px-0.5">
        <span
          className={`block text-xs sm:text-base font-bold truncate leading-tight text-center ${
            p.active ? '' : 'text-slate-800 dark:text-slate-200'
          }`}
          style={p.active ? { color: color.stroke } : undefined}
        >
          {p.name}
        </span>
      </div>
      <div className="text-lg sm:text-xl font-semibold tabular-nums leading-none" style={{ color: color.stroke }}>
        {p.score}
      </div>
      {p.active && (
        <div className="text-[9px] sm:text-[10px] uppercase tracking-wide font-bold">Turn</div>
      )}
      {!p.active && p.skipNext && (
        <div className="text-[9px] sm:text-[10px] uppercase tracking-wide font-semibold text-amber-700 dark:text-amber-400">
          Skip next
        </div>
      )}
    </div>
  )
}

interface GameBoardLayoutProps {
  players: PlayerCardData[]
  children: React.ReactNode
}

/** Player cards around the board; compact strip on very small screens. */
export function GameBoardLayout({ players, children }: GameBoardLayoutProps) {
  const mid = Math.ceil(players.length / 2)
  const left = players.slice(0, mid)
  const right = players.slice(mid)

  return (
    <>
      {/* Mobile: horizontal player strip + board */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-2 w-full max-w-4xl mx-auto min-h-0 sm:hidden">
        <div className="w-full flex flex-wrap justify-center gap-1.5 max-h-24 overflow-y-auto overscroll-contain">
          {players.map((p, i) => (
            <PlayerCard key={p.id ?? `${p.name}-M-${i}`} player={p} compact />
          ))}
        </div>
        <div className="w-full min-w-0 flex items-center justify-center flex-1">{children}</div>
      </div>

      {/* sm+: side player cards */}
      <div className="hidden sm:flex flex-1 items-center justify-center gap-2 sm:gap-3 px-2 w-full max-w-4xl mx-auto min-h-0">
        <div className="flex flex-col gap-2 shrink-0 justify-center">
          {left.map((p, i) => (
            <PlayerCard key={p.id ?? `${p.name}-L-${i}`} player={p} />
          ))}
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-center">{children}</div>
        <div className="flex flex-col gap-2 shrink-0 justify-center">
          {right.map((p, i) => (
            <PlayerCard key={p.id ?? `${p.name}-R-${i}`} player={p} />
          ))}
        </div>
      </div>
    </>
  )
}
