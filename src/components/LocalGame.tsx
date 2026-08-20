import { useState } from 'react'
import type { Player } from '../types/game'
import { PLAYER_COLORS } from '../types/game'
import { useLocalGame } from '../hooks/useLocalGame'
import { useTurnTimer } from '../hooks/useTurnTimer'
import { Board } from './Board'
import { ColorPicker, firstFreeColor } from './ColorPicker'
import { EndModal } from './EndModal'
import {
  MAX_DOTS,
  MAX_PLAYERS,
  MIN_DOTS,
  MIN_PLAYERS,
  NumberSelect,
  TextField,
} from './FormControls'
import { StatusBar } from './StatusBar'
import { TimerSelect } from './TimerSelect'

interface LocalGameProps {
  onExit: () => void
}

export function LocalGame({ onExit }: LocalGameProps) {
  const [setup, setSetup] = useState(true)
  const [dots, setDots] = useState(5)
  const [playerCount, setPlayerCount] = useState(2)
  const [names, setNames] = useState<string[]>(['Player 1', 'Player 2'])
  const [colorIndexes, setColorIndexes] = useState<number[]>([0, 1])
  const [turnSeconds, setTurnSeconds] = useState(30)

  const {
    players,
    game,
    turnSeconds: activeTurnSeconds,
    turnStartedAt,
    winnerIndices,
    restart,
    playEdge,
    expireTurn,
  } = useLocalGame(5, 2)

  const timer = useTurnTimer({
    turnSeconds: setup ? 0 : activeTurnSeconds,
    turnStartedAt: setup ? null : turnStartedAt,
    turnKey: `${game.turnIndex}-${game.moveCount}`,
    finished: game.finished || setup,
    onExpire: () => {
      void expireTurn()
    },
  })

  const applyPlayerCount = (n: number) => {
    setPlayerCount(n)
    setNames((prev) => {
      const next = [...prev]
      while (next.length < n) next.push(`Player ${next.length + 1}`)
      return next.slice(0, n)
    })
    setColorIndexes((prev) => {
      const next = prev.slice(0, n)
      while (next.length < n) {
        next.push(firstFreeColor(next))
      }
      return next
    })
  }

  const start = () => {
    const list: Player[] = names.slice(0, playerCount).map((name, i) => ({
      id: `local-${i}`,
      name: name.trim() || `Player ${i + 1}`,
      colorIndex: colorIndexes[i] ?? i,
    }))
    restart(dots, list, turnSeconds)
    setSetup(false)
  }

  if (setup) {
    return (
      <main className="min-h-full flex items-center justify-center p-6 animate-fade-in">
        <div className="w-full max-w-md rounded-2xl bg-white/80 border border-slate-200 p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-2xl font-semibold">Local game</h2>
            <p className="text-sm text-slate-600 mt-1">Pass one device around. Same rules online.</p>
          </div>
          <NumberSelect
            label="Dots per side"
            hint={`${dots}×${dots} dots → ${(dots - 1) * (dots - 1)} boxes`}
            value={dots}
            min={MIN_DOTS}
            max={MAX_DOTS}
            onChange={setDots}
          />
          <NumberSelect
            label="Players"
            value={playerCount}
            min={MIN_PLAYERS}
            max={MAX_PLAYERS}
            onChange={applyPlayerCount}
          />
          <TimerSelect seconds={turnSeconds} onChange={setTurnSeconds} />
          <div className="space-y-4">
            {names.slice(0, playerCount).map((name, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-slate-100 p-3">
                <TextField
                  label={`Player ${i + 1} (${PLAYER_COLORS[colorIndexes[i] ?? i]!.name})`}
                  value={name}
                  onChange={(v) =>
                    setNames((prev) => {
                      const next = [...prev]
                      next[i] = v
                      return next
                    })
                  }
                />
                <ColorPicker
                  value={colorIndexes[i] ?? i}
                  taken={colorIndexes.slice(0, playerCount).filter((_, j) => j !== i)}
                  onChange={(ci) =>
                    setColorIndexes((prev) => {
                      const next = [...prev]
                      next[i] = ci
                      return next
                    })
                  }
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onExit}
              className="flex-1 rounded-xl border border-slate-200 py-3 font-medium hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={start}
              className="flex-1 rounded-xl bg-[var(--color-ink)] text-white py-3 font-medium hover:opacity-90"
            >
              Start
            </button>
          </div>
        </div>
      </main>
    )
  }

  const statusPlayers = players.map((p, i) => ({
    name: p.name,
    colorIndex: p.colorIndex,
    score: game.scores[i] ?? 0,
    active: !game.finished && game.turnIndex === i,
  }))

  const winTitle =
    winnerIndices.length > 1
      ? 'It\'s a tie!'
      : winnerIndices.length === 1
        ? `${players[winnerIndices[0]!]!.name} wins!`
        : 'Game over'

  const winDetail =
    winnerIndices.length > 1
      ? `Tied at ${game.scores[winnerIndices[0]!]!} boxes: ${winnerIndices.map((i) => players[i]!.name).join(', ')}.`
      : winnerIndices.length === 1
        ? `${players[winnerIndices[0]!]!.name} claimed ${game.scores[winnerIndices[0]!]!} boxes.`
        : ''

  return (
    <div className="min-h-full flex flex-col pb-8 animate-fade-in">
      <StatusBar
        players={statusPlayers}
        onLeave={onExit}
        leaveLabel="Menu"
        onRestart={() => {
          restart(game.dots, players, activeTurnSeconds)
        }}
        subtitle={`${game.dots}×${game.dots} dots${
          activeTurnSeconds ? ` · ${activeTurnSeconds}s / turn` : ''
        }`}
        timerSeconds={timer.enabled ? timer.remainingSec : null}
        timerUrgent={timer.urgency}
      />
      <div className="flex-1 flex items-center px-2">
        <Board
          game={game}
          interactive={!game.finished}
          onEdgeClick={(id) => void playEdge(id)}
          highlightPlayer={game.turnIndex}
          playerColorIndexes={players.map((p) => p.colorIndex)}
        />
      </div>
      <EndModal
        open={game.finished}
        title={winTitle}
        detail={winDetail}
        winnerColorIndexes={winnerIndices.map((i) => players[i]!.colorIndex)}
        primaryLabel="Play Again"
        onPrimary={() => restart(game.dots, players, activeTurnSeconds)}
        secondaryLabel="Change settings"
        onSecondary={() => {
          setSetup(true)
          setDots(game.dots)
          setPlayerCount(players.length)
          setNames(players.map((p) => p.name))
          setColorIndexes(players.map((p) => p.colorIndex))
          setTurnSeconds(activeTurnSeconds)
        }}
      />
    </div>
  )
}
