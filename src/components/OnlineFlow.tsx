import { useState } from 'react'
import { PLAYER_COLORS } from '../types/game'
import { useOnlineLobby } from '../hooks/useOnlineLobby'
import { useGameMusic } from '../hooks/useGameMusic'
import { useAmbientMusic } from '../hooks/useAmbientMusic'
import { useTurnTimer } from '../hooks/useTurnTimer'
import { Board } from './Board'
import { ColorPicker, colorsTakenBy } from './ColorPicker'
import { EndModal } from './EndModal'
import { GameBoardLayout } from './PlayerCard'
import { useGamePreferences } from '../hooks/useGamePreferences'
import { streamerPlayerLabel, streamerSubtitle } from '../utils/streamerDisplay'
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
  ErrorBanner,
  ScreenCard,
  ScreenPage,
  ScreenScroll,
} from './ScreenLayout'

interface OnlineFlowProps {
  intent: 'create' | 'join'
  onExit: () => void
}

export function OnlineFlow({ intent, onExit }: OnlineFlowProps) {
  const online = useOnlineLobby()
  const { streamerMode } = useGamePreferences()
  const [name, setName] = useState('')
  const [dots, setDots] = useState(5)
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [turnSeconds, setTurnSeconds] = useState(30)
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)

  const lobby = online.lobby
  const game = online.game
  const turnSecs = lobby?.settings.turnSeconds ?? 0

  const playing = Boolean(
    lobby?.status === 'playing' && game && !game.finished,
  )
  useAmbientMusic(!playing)
  useGameMusic(playing, game ?? undefined)

  const myTurnEarly =
    Boolean(game && !game.finished && online.uid && lobby?.status === 'playing') &&
    lobby?.seatOrder?.[game!.turnIndex] === online.uid

  const timer = useTurnTimer({
    turnSeconds: turnSecs,
    turnStartedAt: lobby?.game?.turnStartedAt ?? null,
    turnKey: game ? `${game.turnIndex}-${game.moveCount}` : 'idle',
    finished: !game || game.finished || lobby?.status !== 'playing',
    canExpire: myTurnEarly,
    onExpire: () => {
      void online.expireTurn()
    },
  })

  const inLobby = Boolean(online.code && online.lobby)

  if (online.restoring) {
    return (
      <ScreenPage center>
        <p className="text-slate-600 dark:text-slate-400">Reconnecting to lobby…</p>
      </ScreenPage>
    )
  }

  if (!inLobby) {
    return (
      <ScreenPage>
        <ScreenScroll className="flex flex-col justify-center py-4">
          <ScreenCard
            title={intent === 'create' ? 'Create lobby' : 'Join lobby'}
            subtitle={
              intent === 'create'
                ? 'Share the code with friends so they can join from any device.'
                : 'Enter the host’s 6-character code.'
            }
            headerAction={<GameSettingsMenu />}
          >
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

            {online.error && <ErrorBanner>{online.error}</ErrorBanner>}

            <div className={btnRow}>
              <button type="button" onClick={onExit} className={btnRowHalf}>
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
                className={btnRowPrimary}
              >
                {online.busy ? 'Please wait…' : intent === 'create' ? 'Create' : 'Join'}
              </button>
            </div>
          </ScreenCard>
        </ScreenScroll>
      </ScreenPage>
    )
  }

  const liveLobby = online.lobby!
  const isHost = online.uid === liveLobby.hostId

  if (liveLobby.status === 'waiting') {
    const lobbyCodeDisplay = streamerMode ? '******' : (online.code ?? '')

    return (
      <ScreenPage>
        <ScreenScroll wide className="py-2">
          <ScreenCard
            wide
            title="Waiting room"
            subtitle="Invite friends with the join code below."
            headerAction={<GameSettingsMenu />}
          >
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/50 p-4 sm:p-5 lg:flex lg:items-center lg:justify-between lg:gap-8">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center lg:text-left">
                  Join code
                </p>
                <p
                  className="mt-2 font-mono text-2xl sm:text-3xl lg:text-4xl font-bold tracking-[0.28em] sm:tracking-[0.35em] text-center lg:text-left text-[var(--color-ink)] select-all"
                  aria-label={streamerMode ? 'Join code hidden in streamer mode' : `Join code ${online.code}`}
                >
                  {lobbyCodeDisplay}
                </p>
                {streamerMode && (
                  <p className="mt-2 text-xs text-center lg:text-left text-slate-500 dark:text-slate-400">
                    Hidden on screen — turn off streamer mode in Settings to show the code.
                  </p>
                )}
              </div>
              {isHost && (
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
                  className="mt-4 lg:mt-0 w-full lg:w-auto lg:min-w-[11rem] shrink-0 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 py-3 px-5 text-sm font-semibold text-[var(--color-ink)] hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-[0.99]"
                >
                  {copied ? 'Copied to clipboard!' : 'Copy join code'}
                </button>
              )}
            </div>

            <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
              <section className="space-y-3 min-w-0">
                <h3 className="text-sm font-semibold text-[var(--color-ink)]">Players</h3>
                <ul className="space-y-3">
                  {liveLobby.seatOrder.map((id, i) => {
                    const p = liveLobby.players[id]!
                    const color = PLAYER_COLORS[p.colorIndex % PLAYER_COLORS.length]!
                    const takenBy = colorsTakenBy(
                      liveLobby.seatOrder.flatMap((otherId, seatIdx) =>
                        otherId === id
                          ? []
                          : [{ colorIndex: liveLobby.players[otherId]!.colorIndex, seatIndex: seatIdx }],
                      ),
                    )
                    return (
                      <li
                        key={id}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3 py-3 space-y-2"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="size-2.5 rounded-full shrink-0" style={{ background: color.stroke }} />
                          <span className="text-sm font-medium flex-1 truncate text-left">
                            {p.name}
                            {id === liveLobby.hostId ? ' · Host' : ''}
                            {id === online.uid ? ' · You' : ''}
                          </span>
                          <span className="text-xs text-slate-400 shrink-0">P{i + 1}</span>
                        </div>
                        {id === online.uid ? (
                          <ColorPicker
                            label="Your color"
                            value={p.colorIndex}
                            takenBy={takenBy}
                            onChange={(ci) => void online.assignColor(ci)}
                          />
                        ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{color.name}</p>
                        )}
                      </li>
                    )
                  })}
                </ul>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {liveLobby.seatOrder.length}/{liveLobby.settings.maxPlayers} players · need at least 2 to
                  start. Each player picks a unique color before the host starts.
                </p>
              </section>

              <section className="space-y-3 min-w-0 mt-1 lg:mt-0">
                <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                  {isHost ? 'Lobby settings' : 'Game settings'}
                </h3>
                {isHost ? (
                  <div className="space-y-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 p-3 sm:p-4">
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
                  <p className="text-sm text-slate-600 dark:text-slate-400 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 px-3 py-2.5">
                    Turn timer:{' '}
                    <span className="font-medium">
                      {liveLobby.settings.turnSeconds
                        ? `${liveLobby.settings.turnSeconds}s per turn`
                        : 'Off'}
                    </span>
                  </p>
                )}
              </section>
            </div>

            {online.error && <ErrorBanner>{online.error}</ErrorBanner>}

            <div className="flex flex-col gap-2.5 pt-1 lg:flex-row lg:justify-end lg:gap-3 lg:border-t lg:border-slate-100 lg:dark:border-slate-800 lg:pt-5">
              {isHost && (
                <button
                  type="button"
                  disabled={online.busy || liveLobby.seatOrder.length < 2}
                  onClick={() => void online.start()}
                  className={`${btnRowPrimary} lg:max-w-[12rem]`}
                >
                  Start game
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  void (isHost ? online.endLobby() : online.leave()).then(() => onExit())
                }}
                className={`${btnRowHalf} lg:max-w-[12rem]`}
              >
                {isHost ? 'End lobby' : 'Leave'}
              </button>
            </div>
          </ScreenCard>
        </ScreenScroll>
      </ScreenPage>
    )
  }

  if (!online.game) {
    return (
      <ScreenPage center>
        <div className="text-center space-y-3 max-w-sm px-2">
          <p className="text-slate-600 dark:text-slate-400">
            {liveLobby.status === 'playing' ? 'Starting game…' : 'Loading board…'}
          </p>
          {online.error && <ErrorBanner>{online.error}</ErrorBanner>}
        </div>
      </ScreenPage>
    )
  }

  const playGame = online.game
  const statusPlayers = (liveLobby.seatOrder ?? []).map((id, i) => {
    const p = liveLobby.players?.[id]
    const rawName = p?.name ?? `Player ${i + 1}`
    return {
      id,
      name: streamerPlayerLabel(streamerMode, rawName, i, id === online.uid),
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
        ? streamerMode
          ? `Player ${winners[0]! + 1} wins!`
          : `${liveLobby.players?.[winnerSeat!]?.name ?? 'Player'} wins!`
        : 'Game over'

  const winDetail =
    winners.length > 1
      ? `Tied at ${playGame.scores?.[winners[0]!] ?? 0} boxes.`
      : winners.length === 1
        ? streamerMode
          ? `Player ${winners[0]! + 1} claimed ${playGame.scores?.[winners[0]!] ?? 0} boxes.`
          : `${liveLobby.players?.[winnerSeat!]?.name ?? 'Player'} claimed ${playGame.scores?.[winners[0]!] ?? 0} boxes.`
        : ''

  return (
    <div className="min-h-dvh flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))] animate-fade-in">
      <StatusBar
        subtitle={streamerSubtitle(streamerMode, {
          lobbyCode: online.code ?? undefined,
          dots: playGame.dots,
          turnSecs: turnSecs || undefined,
          myTurn,
        })}
        onLeave={() => {
          void online.leave().then(() => onExit())
        }}
        leaveLabel="Leave"
        onRestart={isHost ? () => void online.playAgain() : undefined}
        restartLabel="Play again"
        timerSeconds={
          timer.waitingSync ? 0 : timer.enabled ? timer.remainingSec : null
        }
        timerUrgent={timer.urgency}
        timerPending={timer.waitingSync}
      />
      {timer.waitingSync && !playGame.finished && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 px-4">Turn skipped…</p>
      )}
      {!myTurn && !playGame.finished && !timer.waitingSync && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 px-4">
          {streamerMode
            ? 'Waiting for opponent…'
            : `Waiting for ${
                liveLobby.players?.[liveLobby.seatOrder?.[playGame.turnIndex] ?? '']?.name ??
                'opponent'
              }…`}
        </p>
      )}
      <GameBoardLayout players={statusPlayers}>
        <Board
          game={playGame}
          interactive={myTurn}
          onEdgeClick={(id) => void online.playEdge(id)}
          highlightPlayer={playGame.turnIndex}
          playerColorIndexes={(liveLobby.seatOrder ?? []).map(
            (id) => liveLobby.players?.[id]?.colorIndex ?? 0,
          )}
        />
      </GameBoardLayout>
      {online.error && (
        <p className="mx-4 max-w-md text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 rounded-xl px-3 py-2 mb-3">
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
