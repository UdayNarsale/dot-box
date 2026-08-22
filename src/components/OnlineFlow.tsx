import { useState } from 'react'
import { PLAYER_COLORS } from '../types/game'
import { useOnlineLobby } from '../hooks/useOnlineLobby'
import { useGameMusic } from '../hooks/useGameMusic'
import { useAmbientMusic } from '../hooks/useAmbientMusic'
import { useTurnTimer } from '../hooks/useTurnTimer'
import { Board } from './Board'
import { ColorPicker, colorsTakenBy } from './ColorPicker'
import { EndModal } from './EndModal'
import { TurnCountdownFlash } from './TurnCountdownFlash'
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
  lobbySectionClass,
  LobbyActions,
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
        <ScreenScroll wide={intent === 'create'} className="py-2 pb-3">
          <ScreenCard
            wide={intent === 'create'}
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
              <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start space-y-4 sm:space-y-5 lg:space-y-0">
                <section className="space-y-4 min-w-0 order-1 lg:order-2">
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
                </section>

                <section className="min-w-0 order-2 lg:order-1">
                  <div className={lobbySectionClass}>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Lobby preview</span>
                    <p className="mt-1 text-lg sm:text-xl font-semibold text-[var(--color-ink)]">
                      {dots}×{dots} grid · up to {maxPlayers} players
                      {turnSeconds ? ` · ${turnSeconds}s per turn` : ' · no timer'}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      You’ll get a shareable join code after creating the lobby. Friends pick their color in
                      the waiting room.
                    </p>
                  </div>
                </section>
              </div>
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

            {intent === 'join' && (
              <div className={btnRow}>
                <button type="button" onClick={onExit} className={btnRowHalf}>
                  Back
                </button>
                <button
                  type="button"
                  disabled={online.busy || !name.trim() || joinCode.trim().length < 4}
                  onClick={() => void online.join(joinCode, name)}
                  className={btnRowPrimary}
                >
                  {online.busy ? 'Please wait…' : 'Join'}
                </button>
              </div>
            )}
          </ScreenCard>
        </ScreenScroll>

        {intent === 'create' && (
          <LobbyActions wide>
            <div className={`${btnRow} lg:flex-row lg:justify-end`}>
              <button type="button" onClick={onExit} className={`${btnRowHalf} lg:max-w-[12rem]`}>
                Back
              </button>
              <button
                type="button"
                disabled={online.busy || !name.trim()}
                onClick={() => void online.create({ dots, maxPlayers, turnSeconds }, name)}
                className={`${btnRowPrimary} lg:max-w-[12rem]`}
              >
                {online.busy ? 'Please wait…' : 'Create'}
              </button>
            </div>
          </LobbyActions>
        )}
      </ScreenPage>
    )
  }

  const liveLobby = online.lobby!
  const isHost = online.uid === liveLobby.hostId

  if (liveLobby.status === 'waiting') {
    const lobbyCodeDisplay = streamerMode ? '******' : (online.code ?? '')
    const allReady = liveLobby.seatOrder.every((id) => liveLobby.players[id]?.ready === true)
    const readyCount = liveLobby.seatOrder.filter((id) => liveLobby.players[id]?.ready === true).length

    return (
      <ScreenPage>
        <ScreenScroll wide className="py-2 pb-3">
          <ScreenCard
            wide
            title="Waiting room"
            subtitle="Invite friends with the join code below."
            headerAction={<GameSettingsMenu />}
          >
            <div className={`${lobbySectionClass} lg:flex lg:items-center lg:justify-between lg:gap-6`}>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Join code</span>
                <p
                  className="mt-1 font-mono text-2xl sm:text-3xl lg:text-4xl font-bold tracking-[0.22em] sm:tracking-[0.3em] text-[var(--color-ink)] select-all"
                  aria-label={streamerMode ? 'Join code hidden in streamer mode' : `Join code ${online.code}`}
                >
                  {lobbyCodeDisplay}
                </p>
                {streamerMode && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
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
                  className="mt-3 lg:mt-0 w-full lg:w-auto lg:min-w-[11rem] shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 py-3 px-5 text-sm font-semibold text-[var(--color-ink)] hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  {copied ? 'Copied to clipboard!' : 'Copy join code'}
                </button>
              )}
            </div>

            <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start space-y-4 sm:space-y-5 lg:space-y-0">
              <section className="space-y-4 min-w-0 order-1 lg:order-2">
                {isHost ? (
                  <>
                    <NumberSelect
                      label="Dots per side"
                      hint={`${liveLobby.settings.dots}×${liveLobby.settings.dots} dots → ${(liveLobby.settings.dots - 1) * (liveLobby.settings.dots - 1)} boxes`}
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
                  </>
                ) : (
                  <div className={lobbySectionClass}>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Turn timer</span>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {liveLobby.settings.turnSeconds
                        ? `${liveLobby.settings.turnSeconds}s per turn`
                        : 'Off'}
                    </p>
                  </div>
                )}
              </section>

              <section className="space-y-3 min-w-0 order-2 lg:order-1">
                <div className="space-y-3 sm:space-y-4">
                  {liveLobby.seatOrder.map((id) => {
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
                      <div key={id} className={lobbySectionClass}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="size-2.5 rounded-full shrink-0" style={{ background: color.stroke }} />
                          <span className="text-sm font-medium flex-1 truncate text-left">
                            {p.name}
                            {id === liveLobby.hostId ? ' · Host' : ''}
                            {id === online.uid ? ' · You' : ''}
                          </span>
                          {id === online.uid ? (
                            <button
                              type="button"
                              onClick={() => void online.setReady(!p.ready)}
                              className={
                                p.ready
                                  ? 'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 transition'
                                  : 'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition'
                              }
                            >
                              {p.ready ? 'Ready ✓' : 'Ready up'}
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-xs font-medium ${p.ready ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}
                              >
                                {p.ready ? 'Ready' : 'Not ready'}
                              </span>
                              {isHost && (
                                <button
                                  type="button"
                                  onClick={() => void online.kickPlayer(id)}
                                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-950/60 transition"
                                >
                                  Kick
                                </button>
                              )}
                            </div>
                          )}
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
                      </div>
                    )
                  })}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-0.5">
                  {liveLobby.seatOrder.length}/{liveLobby.settings.maxPlayers} players · {readyCount}/
                  {liveLobby.seatOrder.length} ready
                  {liveLobby.seatOrder.length >= 2 && !allReady ? ' · waiting for everyone to ready up' : ''}
                  {liveLobby.seatOrder.length < 2 ? ' · need at least 2 to start' : ''}. Each player picks a
                  unique color, then taps Ready.
                </p>
              </section>
            </div>

            {online.error && <ErrorBanner>{online.error}</ErrorBanner>}
          </ScreenCard>
        </ScreenScroll>

        <LobbyActions wide>
          <div className={`${btnRow} lg:flex-row lg:justify-end`}>
            {isHost && (
              <button
                type="button"
                disabled={online.busy || liveLobby.seatOrder.length < 2 || !allReady}
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
        </LobbyActions>
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
    <div className="relative min-h-dvh flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))] animate-fade-in">
      <TurnCountdownFlash countdownSec={timer.countdownSec} />
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
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
        onBackToLobby={isHost ? () => void online.returnToLobby() : undefined}
        leaveLabel="Leave"
        onRestart={isHost ? () => void online.playAgain() : undefined}
        restartLabel="Play again"
        timerSeconds={
          timer.waitingSync ? 0 : timer.enabled ? timer.remainingSec : null
        }
        timerUrgent={timer.urgency}
        timerPending={timer.waitingSync}
        countdownSec={timer.countdownSec}
      />
      {timer.waitingSync && !playGame.finished && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 px-4 shrink-0 min-h-[2.5rem] flex items-center justify-center">
          Turn skipped…
        </p>
      )}
      {!timer.waitingSync && (
        <div className="shrink-0 min-h-[2.5rem] flex items-center justify-center px-4">
          {!myTurn && !playGame.finished ? (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              {streamerMode
                ? 'Waiting for opponent…'
                : `Waiting for ${
                    liveLobby.players?.[liveLobby.seatOrder?.[playGame.turnIndex] ?? '']?.name ??
                    'opponent'
                  }…`}
            </p>
          ) : (
            <span className="text-sm invisible select-none" aria-hidden>
              ·
            </span>
          )}
        </div>
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
        backToLobbyLabel={isHost ? 'Back to lobby' : undefined}
        onBackToLobby={isHost ? () => void online.returnToLobby() : undefined}
        secondaryLabel="Leave"
        onSecondary={() => {
          void online.leave().then(() => onExit())
        }}
      />
      </div>
    </div>
  )
}
