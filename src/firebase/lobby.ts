import {
  get,
  onValue,
  ref,
  remove,
  runTransaction,
  set,
  update,
  type Unsubscribe,
} from 'firebase/database'
import { applyTimeoutPenalty, createGame, toStringList } from '../engine/gameEngine'
import { MAX_COLOR_INDEX } from '../types/game'
import type { LobbyGame, LobbySettings, LobbyState } from '../types/game'
import { ensureAnonymousAuth, getFirebaseDb } from './config'

function nowMs() {
  return Date.now()
}

function withTurnClock(
  game: Omit<LobbyGame, 'turnStartedAt' | 'turnPlayerId'> & {
    turnStartedAt?: number
    turnPlayerId?: string
  },
  turnPlayerId: string,
): LobbyGame {
  return {
    ...game,
    turnStartedAt: nowMs(),
    turnPlayerId,
  }
}

function lobbyRef(code: string) {
  return ref(getFirebaseDb(), `lobbies/${code.toUpperCase()}`)
}

function gameRef(code: string) {
  return ref(getFirebaseDb(), `lobbies/${code.toUpperCase()}/game`)
}

function playerRef(code: string, uid: string) {
  return ref(getFirebaseDb(), `lobbies/${code.toUpperCase()}/players/${uid}`)
}

/** RTDB drops empty objects and may return arrays as maps — normalize for the UI. */
export function normalizeLobby(raw: LobbyState): LobbyState {
  const seatOrder = toStringList(
    raw.seatOrder as string[] | Record<string, string> | null | undefined,
  )
  return {
    ...raw,
    seatOrder,
    settings: {
      dots: Number(raw.settings?.dots) || 5,
      maxPlayers: Number(raw.settings?.maxPlayers) || 4,
      turnSeconds: Number(raw.settings?.turnSeconds) || 0,
    },
    players: raw.players ?? {},
    game: raw.game
      ? {
          ...raw.game,
          lines: raw.game.lines ?? {},
          boxes: raw.game.boxes ?? {},
          skipPenalties: raw.game.skipPenalties ?? [],
          turnStartedAt: Number(raw.game.turnStartedAt) || Date.now(),
          turnPlayerId:
            raw.game.turnPlayerId ?? seatOrder[Number(raw.game.turnIndex) || 0] ?? undefined,
        }
      : null,
  }
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateLobbyCode(length = 6): string {
  let code = ''
  const arr = new Uint32Array(length)
  crypto.getRandomValues(arr)
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[arr[i]! % CODE_CHARS.length]
  }
  return code
}

export async function createLobby(
  settings: LobbySettings,
  hostName: string,
): Promise<{ code: string; uid: string }> {
  const uid = await ensureAnonymousAuth()
  const db = getFirebaseDb()

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateLobbyCode()
    const snap = await get(ref(db, `lobbies/${code}`))
    if (snap.exists()) continue

    const lobby: LobbyState = {
      hostId: uid,
      status: 'waiting',
      settings: {
        dots: settings.dots,
        maxPlayers: settings.maxPlayers,
        turnSeconds: settings.turnSeconds ?? 0,
      },
      players: {
        [uid]: {
          name: hostName.trim() || 'Host',
          colorIndex: 0,
          joinedAt: Date.now(),
          ready: false,
        },
      },
      seatOrder: [uid],
      game: null,
      createdAt: Date.now(),
    }
    await set(ref(db, `lobbies/${code}`), lobby)
    return { code, uid }
  }
  throw new Error('Could not allocate a lobby code. Try again.')
}

function gameMaps(game: LobbyGame | null | undefined) {
  return {
    lines: game?.lines ?? {},
    boxes: game?.boxes ?? {},
  }
}

export async function joinLobby(
  code: string,
  name: string,
): Promise<{ uid: string; code: string }> {
  const uid = await ensureAnonymousAuth()
  const normalized = code.trim().toUpperCase()
  const r = lobbyRef(normalized)

  const result = await runTransaction(r, (current: LobbyState | null) => {
    if (!current) return current
    // Same uid reconnecting (e.g. after refresh) — skip join checks.
    if (current.players[uid]) return current
    if (current.status !== 'waiting') return

    const count = Object.keys(current.players).length
    if (count >= current.settings.maxPlayers) return

    const usedColors = new Set(Object.values(current.players).map((p) => p.colorIndex))
    let colorIndex = 0
    while (usedColors.has(colorIndex) && colorIndex < MAX_COLOR_INDEX) colorIndex++

    return {
      ...current,
      players: {
        ...current.players,
        [uid]: {
          name: name.trim() || `Player ${count + 1}`,
          colorIndex,
          joinedAt: Date.now(),
          ready: false,
        },
      },
      seatOrder: [...current.seatOrder, uid],
    }
  })

  if (!result.committed || !result.snapshot.exists()) {
    throw new Error('Unable to join. Check the code, lobby capacity, or if the game already started.')
  }
  return { uid, code: normalized }
}

/** Reconnect after refresh when the same anonymous uid is still in the lobby. */
export async function reconnectLobby(code: string): Promise<{ uid: string; code: string } | null> {
  const uid = await ensureAnonymousAuth()
  const normalized = code.trim().toUpperCase()
  const snap = await get(lobbyRef(normalized))
  if (!snap.exists()) return null
  const lobby = normalizeLobby(snap.val() as LobbyState)
  if (!lobby.players[uid]) return null
  return { uid, code: normalized }
}

export async function leaveLobby(code: string, uid: string): Promise<void> {
  const r = lobbyRef(code)
  await runTransaction(r, (current: LobbyState | null) => {
    if (!current || !current.players[uid]) return current

    const { [uid]: _removed, ...players } = current.players
    const seatOrder = current.seatOrder.filter((id) => id !== uid)

    if (seatOrder.length === 0) {
      return null
    }

    const hostId = current.hostId === uid ? seatOrder[0]! : current.hostId
    let status = current.status
    let game = current.game

    if (seatOrder.length < 2 && status === 'playing') {
      status = 'finished'
      if (game) game = { ...game, finished: true }
    }

    return {
      ...current,
      hostId,
      players,
      seatOrder,
      status,
      game,
    }
  })
}

export async function setPlayerColor(
  code: string,
  uid: string,
  colorIndex: number,
): Promise<void> {
  if (colorIndex < 0 || colorIndex > MAX_COLOR_INDEX) {
    throw new Error('Invalid color.')
  }

  const normalized = code.trim().toUpperCase()
  const lobbyR = lobbyRef(normalized)
  const playerR = playerRef(normalized, uid)

  const snap = await get(lobbyR)
  if (!snap.exists()) throw new Error('Lobby not found.')
  const lobby = normalizeLobby(snap.val() as LobbyState)
  if (lobby.status !== 'waiting') {
    throw new Error('Colors can only be changed in the waiting room.')
  }
  if (!lobby.players[uid]) {
    throw new Error('You are not in this lobby.')
  }

  const taken = Object.entries(lobby.players).some(
    ([id, p]) => id !== uid && p.colorIndex === colorIndex,
  )
  if (taken) throw new Error('That color is already taken.')

  try {
    const current = lobby.players[uid]!
    await update(playerR, {
      name: current.name,
      colorIndex,
      joinedAt: current.joinedAt,
      ready: false,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/permission_denied/i.test(msg)) {
      throw new Error(
        'Could not save color — Firebase blocked the write. Publish the latest database.rules.json (colorIndex 0–19) in the Firebase console.',
      )
    }
    throw e
  }
}

export async function setPlayerReady(
  code: string,
  uid: string,
  ready: boolean,
): Promise<void> {
  const normalized = code.trim().toUpperCase()
  const lobbyR = lobbyRef(normalized)
  const playerR = playerRef(normalized, uid)

  const snap = await get(lobbyR)
  if (!snap.exists()) throw new Error('Lobby not found.')
  const lobby = normalizeLobby(snap.val() as LobbyState)
  if (lobby.status !== 'waiting') {
    throw new Error('Ready status can only be changed in the waiting room.')
  }
  if (!lobby.players[uid]) {
    throw new Error('You are not in this lobby.')
  }

  const current = lobby.players[uid]!
  try {
    await update(playerR, {
      name: current.name,
      colorIndex: current.colorIndex,
      joinedAt: current.joinedAt,
      ready,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/permission_denied/i.test(msg)) {
      throw new Error(
        'Could not update ready status — publish the latest database.rules.json in the Firebase console.',
      )
    }
    throw e
  }
}

export async function updateLobbySettings(
  code: string,
  uid: string,
  settings: LobbySettings,
): Promise<void> {
  const r = lobbyRef(code)
  const result = await runTransaction(r, (current: LobbyState | null) => {
    if (!current || current.hostId !== uid || current.status !== 'waiting') return

    const players = { ...current.players }
    for (const id of Object.keys(players)) {
      players[id] = { ...players[id]!, ready: false }
    }

    return {
      ...current,
      settings: {
        dots: settings.dots,
        maxPlayers: settings.maxPlayers,
        turnSeconds: settings.turnSeconds ?? 0,
      },
      players,
    }
  })

  if (!result.committed) {
    throw new Error('Only the host can change settings before the game starts.')
  }
}

export async function startLobbyGame(code: string, uid: string): Promise<void> {
  const r = lobbyRef(code)
  await runTransaction(r, (current: LobbyState | null) => {
    if (!current) return current
    if (current.hostId !== uid) return
    if (current.status !== 'waiting') return
    if (current.seatOrder.length < 2) return

    const colors = current.seatOrder.map((id) => current.players[id]?.colorIndex)
    if (new Set(colors).size !== colors.length) return

    const allReady = current.seatOrder.every((id) => current.players[id]?.ready === true)
    if (!allReady) return

    const fresh = createGame(current.settings.dots, current.seatOrder.length)
    const firstPlayer = current.seatOrder[0]!
    const game = withTurnClock(
      {
        lines: {},
        boxes: {},
        scores: fresh.scores,
        turnIndex: 0,
        moveCount: 0,
        finished: false,
        skipPenalties: fresh.skipPenalties,
      },
      firstPlayer,
    )
    return {
      ...current,
      status: 'playing',
      game,
    }
  }).then((res) => {
    if (!res.committed) {
      throw new Error('Could not start. Need at least 2 players, unique colors, all ready, and host permission.')
    }
  })
}

export async function submitOnlineMove(
  code: string,
  uid: string,
  nextGame: Omit<LobbyGame, 'turnStartedAt' | 'turnPlayerId'> & {
    turnStartedAt?: number
    turnPlayerId?: string
  },
  edgeId: string,
  expectedMoveCount: number,
  nextTurnPlayerId: string,
): Promise<void> {
  const gr = gameRef(code)
  await runTransaction(gr, (current: LobbyGame | null) => {
    if (!current) return
    if (current.moveCount !== expectedMoveCount) return
    if (current.finished) return
    if (current.turnPlayerId && current.turnPlayerId !== uid) return
    const { lines } = gameMaps(current)
    if (lines[edgeId] !== undefined) return

    return withTurnClock(
      {
        lines: nextGame.lines,
        boxes: nextGame.boxes,
        scores: nextGame.scores,
        turnIndex: nextGame.turnIndex,
        moveCount: nextGame.moveCount,
        finished: nextGame.finished,
        skipPenalties: nextGame.skipPenalties ?? current.skipPenalties ?? [],
      },
      nextTurnPlayerId,
    )
  }).then(async (res) => {
    if (!res.committed) {
      throw new Error('Move rejected (not your turn, stale state, or line taken).')
    }
    if (nextGame.finished) {
      await update(lobbyRef(code), { status: 'finished' })
    }
  })
}

/** Timer expiry: end turn + queue one extra skipped turn (no line placed). */
export async function applyTimeoutOnlineTurn(
  code: string,
  expectedMoveCount: number,
): Promise<void> {
  const lobbySnap = await get(lobbyRef(code))
  if (!lobbySnap.exists()) return
  const lobby = normalizeLobby(lobbySnap.val() as LobbyState)
  if (lobby.status !== 'playing' || !lobby.game) return

  const turnSeconds = lobby.settings.turnSeconds ?? 0
  if (!turnSeconds || turnSeconds <= 0) return

  const seatOrder = lobby.seatOrder
  const dots = lobby.settings.dots

  await runTransaction(gameRef(code), (current: LobbyGame | null) => {
    if (!current) return
    if (current.finished) return
    if (current.moveCount !== expectedMoveCount) return

    const started = current.turnStartedAt ?? 0
    if (!started || Date.now() < started + turnSeconds * 1000) return

    const { lines, boxes } = gameMaps(current)
    const state = {
      dots,
      lines,
      boxes,
      scores: current.scores,
      turnIndex: current.turnIndex,
      moveCount: current.moveCount,
      finished: current.finished,
      playerCount: seatOrder.length,
      skipPenalties: current.skipPenalties ?? [],
    }
    const next = applyTimeoutPenalty(state)
    if (!next) return

    const nextTurnPlayerId = seatOrder[next.turnIndex] ?? seatOrder[0]!
    return withTurnClock(
      {
        lines: next.lines,
        boxes: next.boxes,
        scores: next.scores,
        turnIndex: next.turnIndex,
        moveCount: next.moveCount,
        finished: next.finished,
        skipPenalties: next.skipPenalties,
      },
      nextTurnPlayerId,
    )
  })
}

export async function resetLobbyGame(code: string, uid: string): Promise<void> {
  const r = lobbyRef(code)
  await runTransaction(r, (current: LobbyState | null) => {
    if (!current) return current
    if (current.hostId !== uid) return
    if (current.seatOrder.length < 2) return

    const fresh = createGame(current.settings.dots, current.seatOrder.length)
    const firstPlayer = current.seatOrder[0]!
    return {
      ...current,
      status: 'playing',
      game: withTurnClock(
        {
          lines: {},
          boxes: {},
          scores: fresh.scores,
          turnIndex: 0,
          moveCount: 0,
          finished: false,
          skipPenalties: fresh.skipPenalties,
        },
        firstPlayer,
      ),
    }
  }).then((res) => {
    if (!res.committed) throw new Error('Only the host can restart with at least 2 players.')
  })
}

export async function deleteLobby(code: string, uid: string): Promise<void> {
  const r = lobbyRef(code)
  const snap = await get(r)
  const lobby = snap.val() as LobbyState | null
  if (!lobby) return
  if (lobby.hostId !== uid) throw new Error('Only the host can end the lobby.')
  await remove(r)
}

export function subscribeLobby(code: string, onData: (lobby: LobbyState | null) => void): Unsubscribe {
  return onValue(lobbyRef(code), (snap) => {
    if (!snap.exists()) {
      onData(null)
      return
    }
    onData(normalizeLobby(snap.val() as LobbyState))
  })
}
