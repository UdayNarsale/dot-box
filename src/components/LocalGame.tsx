import { useState } from 'react'
import type { Player } from '../types/game'
import { PLAYER_COLORS } from '../types/game'
import { useLocalGame } from '../hooks/useLocalGame'
import { useGameMusic } from '../hooks/useGameMusic'
import { useAmbientMusic } from '../hooks/useAmbientMusic'
import { useTurnTimer } from '../hooks/useTurnTimer'
import { Board } from './Board'
import { ColorPicker, colorsTakenBy, firstFreeColor } from './ColorPicker'
import { EndModal } from './EndModal'
import { useGamePreferences } from '../hooks/useGamePreferences'
import { streamerPlayerLabel } from '../utils/streamerDisplay'
import { GameBoardLayout } from './PlayerCard'
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
import { GameSettingsMenu } from './GameSettingsMenu'
import {
  btnRow,
  btnRowHalf,
  btnRowPrimary,
  ScreenCard,
  ScreenPage,
  ScreenScroll,
} from './ScreenLayout'

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
  const { streamerMode } = useGamePreferences()

  useAmbientMusic(setup || game.finished)
  useGameMusic(!setup && !game.finished, game)

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
      <ScreenPage>
        <ScreenScroll className="py-2">
          <ScreenCard
            title="Local game"
            subtitle="Pass one device around. Same rules as online."
            headerAction={<GameSettingsMenu />}
          >
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
            <div className="space-y-3 sm:space-y-4">
              {names.slice(0, playerCount).map((name, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-slate-100 dark:border-slate-700 p-3">
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
                    takenBy={colorsTakenBy(
                      colorIndexes.slice(0, playerCount).flatMap((ci, j) =>
                        j === i ? [] : [{ colorIndex: ci, seatIndex: j }],
                      ),
                    )}
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
            <div className={btnRow}>
              <button type="button" onClick={onExit} className={btnRowHalf}>
                Back
              </button>
              <button type="button" onClick={start} className={btnRowPrimary}>
                Start
              </button>
            </div>
          </ScreenCard>
        </ScreenScroll>
      </ScreenPage>
    )
  }

  const statusPlayers = players.map((p, i) => ({
    name: streamerPlayerLabel(streamerMode, p.name, i),
    colorIndex: p.colorIndex,
    score: game.scores[i] ?? 0,
    active: !game.finished && game.turnIndex === i,
    skipNext: (game.skipPenalties?.[i] ?? 0) > 0,
  }))

  const winTitle =
    winnerIndices.length > 1
      ? 'It\'s a tie!'
      : winnerIndices.length === 1
        ? streamerMode
          ? `Player ${winnerIndices[0]! + 1} wins!`
          : `${players[winnerIndices[0]!]!.name} wins!`
        : 'Game over'

  const winDetail =
    winnerIndices.length > 1
      ? streamerMode
        ? `Tied at ${game.scores[winnerIndices[0]!]!} boxes.`
        : `Tied at ${game.scores[winnerIndices[0]!]!} boxes: ${winnerIndices.map((i) => players[i]!.name).join(', ')}.`
      : winnerIndices.length === 1
        ? streamerMode
          ? `Player ${winnerIndices[0]! + 1} claimed ${game.scores[winnerIndices[0]!]!} boxes.`
          : `${players[winnerIndices[0]!]!.name} claimed ${game.scores[winnerIndices[0]!]!} boxes.`
        : ''

  return (
    <div className="min-h-dvh flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))] animate-fade-in">
      <StatusBar
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
      <GameBoardLayout players={statusPlayers}>
        <Board
          game={game}
          interactive={!game.finished}
          onEdgeClick={(id) => void playEdge(id)}
          highlightPlayer={game.turnIndex}
          playerColorIndexes={players.map((p) => p.colorIndex)}
        />
      </GameBoardLayout>
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
