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
}

export function PlayerCard({ player: p }: PlayerCardProps) {
  const color = PLAYER_COLORS[p.colorIndex % PLAYER_COLORS.length]!

  return (
    <div
      className={`w-[6.25rem] sm:w-[7rem] aspect-square shrink-0 rounded-xl p-2 backdrop-blur flex flex-col items-center justify-center gap-0.5 text-center ${
        p.active
          ? 'animate-pulse-turn border-[3px] border-current'
          : 'bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700'
      }`}
      style={p.active ? { color: color.stroke } : undefined}
    >
      <div className="w-full min-w-0 px-0.5">
        <span
          className={`block text-sm sm:text-base font-bold truncate leading-tight text-center ${
            p.active ? '' : 'text-slate-800 dark:text-slate-200'
          }`}
          style={p.active ? { color: color.stroke } : undefined}
        >
          {p.name}
        </span>
      </div>
      <div className="text-xl font-semibold tabular-nums leading-none" style={{ color: color.stroke }}>
        {p.score}
      </div>
      {p.active && (
        <div className="text-[10px] uppercase tracking-wide font-bold">Turn</div>
      )}
      {!p.active && p.skipNext && (
        <div className="text-[10px] uppercase tracking-wide font-semibold text-amber-700 dark:text-amber-400">
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

/** Player cards on left/right of the board; extra seats stack on each side. */
export function GameBoardLayout({ players, children }: GameBoardLayoutProps) {
  const mid = Math.ceil(players.length / 2)
  const left = players.slice(0, mid)
  const right = players.slice(mid)

  return (
    <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 px-2 w-full max-w-4xl mx-auto min-h-0">
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
  )
}
