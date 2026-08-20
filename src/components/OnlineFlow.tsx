import { useState } from 'react'
import { PLAYER_COLORS } from '../types/game'
import { useOnlineLobby } from '../hooks/useOnlineLobby'
import { useTurnTimer } from '../hooks/useTurnTimer'
import { Board } from './Board'
import { ColorPicker } from './ColorPicker'
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

interface OnlineFlowProps {
  intent: 'create' | 'join'
  onExit: () => void
}

export function OnlineFlow({ intent, onExit }: OnlineFlowProps) {
  const online = useOnlineLobby()
  const [name, setName] = useState('')
  const [dots, setDots] = useState(5)
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [turnSeconds, setTurnSeconds] = useState(30)
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)

  const lobby = online.lobby
  const game = online.game
  const turnSecs = lobby?.settings.turnSeconds ?? 0

  const timer = useTurnTimer({
    turnSeconds: turnSecs,
    turnStartedAt: lobby?.game?.turnStartedAt ?? null,
    turnKey: game ? `${game.turnIndex}-${game.moveCount}` : 'idle',
    finished: !game || game.finished || lobby?.status !== 'playing',
    onExpire: () => {
      void online.expireTurn()
    },
  })

  const inLobby = Boolean(online.code && online.lobby)

  if (!inLobby) {
    return (
      <main className="min-h-full flex items-center justify-center p-6 animate-fade-in">
        <div className="w-full max-w-md rounded-2xl bg-white/80 border border-slate-200 p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-2xl font-semibold">
              {intent === 'create' ? 'Create lobby' : 'Join lobby'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {intent === 'create'
                ? 'Share the code with friends so they can join from any device.'
                : 'Enter the host’s 6-character code.'}
            </p>
          </div>

          <TextField label="Your name" value={name} onChange={setName} placeholder="Nickname" />

          {intent === 'create' ? (
            <>
              <NumberSelect
                label="Dots per side"
                hint={`${dots}×${dots} dots → ${(dots - 1) * (dots - 1)} boxes`}
                value={dots}
                min={MIN_DOTS}
                max={MAX_DOTS}
                onChange={setDots}
              />
              <NumberSelect
                label="Max players"
                value={maxPlayers}
                min={MIN_PLAYERS}
                max={MAX_PLAYERS}
                onChange={setMaxPlayers}
              />
              <TimerSelect seconds={turnSeconds} onChange={setTurnSeconds} />
            </>
          ) : (
            <TextField
              label="Lobby code"
              value={joinCode}
              onChange={(v) => setJoinCode(v.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
            />
          )}

          {online.error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {online.error}
            </p>
          )}

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
              disabled={online.busy || !name.trim() || (intent === 'join' && joinCode.trim().length < 4)}
              onClick={() => {
                if (intent === 'create') {
                  void online.create({ dots, maxPlayers, turnSeconds }, name)
                } else {
                  void online.join(joinCode, name)
                }
              }}
              className="flex-1 rounded-xl bg-[var(--color-ink)] text-white py-3 font-medium hover:opacity-90 disabled:opacity-50"
            >
              {online.busy ? 'Please wait…' : intent === 'create' ? 'Create' : 'Join'}
            </button>
          </div>
        </div>
      </main>
    )
  }

  const liveLobby = online.lobby!
  const isHost = online.uid === liveLobby.hostId

  if (liveLobby.status === 'waiting') {
    return (
      <main className="min-h-full flex items-center justify-center p-6 animate-fade-in">
        <div className="w-full max-w-md rounded-2xl bg-white/80 border border-slate-200 p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-2xl font-semibold">Waiting room</h2>
            <p className="text-sm text-slate-600 mt-1">
              Code{' '}
              <span className="font-mono font-semibold tracking-widest text-[var(--color-ink)]">
                {online.code}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              if (!online.code) return
              try {
                await navigator.clipboard.writeText(online.code)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              } catch {
                /* ignore */
              }
            }}
            className="w-full rounded-xl border border-slate-200 py-3 font-medium hover:bg-slate-50"
          >
            {copied ? 'Copied!' : 'Copy join code'}
          </button>

          {isHost ? (
            <div className="space-y-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
              <NumberSelect
                label="Dots per side"
                value={liveLobby.settings.dots}
                min={MIN_DOTS}
                max={MAX_DOTS}
                onChange={(d) => void online.saveSettings({ ...liveLobby.settings, dots: d })}
              />
              <NumberSelect
                label="Max players"
                value={liveLobby.settings.maxPlayers}
                min={MIN_PLAYERS}
                max={MAX_PLAYERS}
                onChange={(m) => void online.saveSettings({ ...liveLobby.settings, maxPlayers: m })}
              />
              <TimerSelect
                seconds={liveLobby.settings.turnSeconds ?? 0}
                onChange={(s) => void online.saveSettings({ ...liveLobby.settings, turnSeconds: s })}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-600 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
              Turn timer:{' '}
              <span className="font-medium">
                {liveLobby.settings.turnSeconds
                  ? `${liveLobby.settings.turnSeconds}s per turn`
                  : 'Off'}
              </span>
            </p>
          )}

          <ul className="space-y-3">
            {liveLobby.seatOrder.map((id, i) => {
              const p = liveLobby.players[id]!
              const color = PLAYER_COLORS[p.colorIndex % PLAYER_COLORS.length]!
              const taken = liveLobby.seatOrder
                .filter((other) => other !== id)
                .map((other) => liveLobby.players[other]!.colorIndex)
              return (
                <li
                  key={id}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3 space-y-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="size-2.5 rounded-full" style={{ background: color.stroke }} />
                    <span className="text-sm font-medium flex-1">
                      {p.name}
                      {id === liveLobby.hostId ? ' · Host' : ''}
                      {id === online.uid ? ' · You' : ''}
                    </span>
                    <span className="text-xs text-slate-400">P{i + 1}</span>
                  </div>
                  {isHost ? (
                    <ColorPicker
                      label={`Color for ${p.name}`}
                      value={p.colorIndex}
                      taken={taken}
                      onChange={(ci) => void online.assignColor(id, ci)}
                    />
                  ) : (
                    <p className="text-xs text-slate-500">{color.name}</p>
                  )}
                </li>
              )
            })}
          </ul>

          <p className="text-xs text-slate-500">
            {liveLobby.seatOrder.length}/{liveLobby.settings.maxPlayers} players · need at least 2 to
            start. Each player must have a unique color.
          </p>

          {online.error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {online.error}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {isHost && (
              <button
                type="button"
                disabled={online.busy || liveLobby.seatOrder.length < 2}
                onClick={() => void online.start()}
                className="w-full rounded-xl bg-[var(--color-ink)] text-white py-3 font-medium hover:opacity-90 disabled:opacity-50"
              >
                Start game
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void (isHost ? online.endLobby() : online.leave()).then(() => onExit())
              }}
              className="w-full rounded-xl border border-slate-200 py-3 font-medium hover:bg-slate-50"
            >
              {isHost ? 'End lobby' : 'Leave'}
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!online.game) {
    return (
      <main className="min-h-full flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <p className="text-slate-600">
            {liveLobby.status === 'playing' ? 'Starting game…' : 'Loading board…'}
          </p>
          {online.error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {online.error}
            </p>
          )}
        </div>
      </main>
    )
  }

  const playGame = online.game
  const statusPlayers = (liveLobby.seatOrder ?? []).map((id, i) => {
    const p = liveLobby.players?.[id]
    return {
      name: p?.name ?? `Player ${i + 1}`,
      colorIndex: p?.colorIndex ?? i,
      score: playGame.scores?.[i] ?? 0,
      active: !playGame.finished && playGame.turnIndex === i,
      isYou: id === online.uid,
      skipNext: (playGame.skipPenalties?.[i] ?? 0) > 0,
    }
  })

  const myTurn =
    !playGame.finished &&
    online.uid !== null &&
    liveLobby.seatOrder?.[playGame.turnIndex] === online.uid

  const winners = online.winnerIndices
  const winnerSeat = winners.length === 1 ? liveLobby.seatOrder?.[winners[0]!] : undefined
  const winTitle =
    winners.length > 1
      ? 'It\'s a tie!'
      : winners.length === 1
        ? `${liveLobby.players?.[winnerSeat!]?.name ?? 'Player'} wins!`
        : 'Game over'

  const winDetail =
    winners.length > 1
      ? `Tied at ${playGame.scores?.[winners[0]!] ?? 0} boxes.`
      : winners.length === 1
        ? `${liveLobby.players?.[winnerSeat!]?.name ?? 'Player'} claimed ${playGame.scores?.[winners[0]!] ?? 0} boxes.`
        : ''

  return (
    <div className="min-h-full flex flex-col pb-8 animate-fade-in">
      <StatusBar
        players={statusPlayers}
        subtitle={`Lobby ${online.code} · ${playGame.dots}×${playGame.dots}${
          turnSecs ? ` · ${turnSecs}s / turn` : ''
        }${myTurn ? ' · Your turn' : ''}`}
        onLeave={() => {
          void online.leave().then(() => onExit())
        }}
        leaveLabel="Leave"
        onRestart={isHost ? () => void online.playAgain() : undefined}
        restartLabel="Play again"
        timerSeconds={timer.enabled ? timer.remainingSec : null}
        timerUrgent={timer.urgency}
      />
      {!myTurn && !playGame.finished && (
        <p className="text-center text-sm text-slate-500 px-4">
          Waiting for{' '}
          {liveLobby.players?.[liveLobby.seatOrder?.[playGame.turnIndex] ?? '']?.name ?? 'opponent'}
          …
        </p>
      )}
      <div className="flex-1 flex items-center px-2">
        <Board
          game={playGame}
          interactive={myTurn}
          onEdgeClick={(id) => void online.playEdge(id)}
          highlightPlayer={playGame.turnIndex}
          playerColorIndexes={(liveLobby.seatOrder ?? []).map(
            (id) => liveLobby.players?.[id]?.colorIndex ?? 0,
          )}
        />
      </div>
      {online.error && (
        <p className="mx-auto max-w-md text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">
          {online.error}
        </p>
      )}
      <EndModal
        open={playGame.finished || liveLobby.status === 'finished'}
        title={winTitle}
        detail={winDetail}
        winnerColorIndexes={winners.map(
          (i) => liveLobby.players?.[liveLobby.seatOrder?.[i] ?? '']?.colorIndex ?? 0,
        )}
        primaryLabel={isHost ? 'Play Again' : 'Waiting for host…'}
        onPrimary={() => {
          if (isHost) void online.playAgain()
        }}
        secondaryLabel="Leave"
        onSecondary={() => {
          void online.leave().then(() => onExit())
        }}
      />
    </div>
  )
}
