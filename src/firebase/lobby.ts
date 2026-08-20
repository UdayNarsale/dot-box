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
import { applyTimeoutPenalty, createGame } from '../engine/gameEngine'
import type { LobbyGame, LobbySettings, LobbyState } from '../types/game'
import { ensureAnonymousAuth, getFirebaseDb } from './config'

function nowMs() {
  return Date.now()
}

function withTurnClock(game: Omit<LobbyGame, 'turnStartedAt'> | LobbyGame): LobbyGame {
  return {
    ...game,
    turnStartedAt: nowMs(),
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

function lobbyRef(code: string) {
  return ref(getFirebaseDb(), `lobbies/${code.toUpperCase()}`)
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

export async function joinLobby(
  code: string,
  name: string,
): Promise<{ uid: string; code: string }> {
  const uid = await ensureAnonymousAuth()
  const normalized = code.trim().toUpperCase()
  const r = lobbyRef(normalized)

  const result = await runTransaction(r, (current: LobbyState | null) => {
    if (!current) return current
    if (current.status !== 'waiting') return
    if (current.players[uid]) return current

    const count = Object.keys(current.players).length
    if (count >= current.settings.maxPlayers) return

    const usedColors = new Set(Object.values(current.players).map((p) => p.colorIndex))
    let colorIndex = 0
    while (usedColors.has(colorIndex) && colorIndex < 8) colorIndex++

    return {
      ...current,
      players: {
        ...current.players,
        [uid]: {
          name: name.trim() || `Player ${count + 1}`,
          colorIndex,
          joinedAt: Date.now(),
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
  hostId: string,
  playerId: string,
  colorIndex: number,
): Promise<void> {
  if (colorIndex < 0 || colorIndex > 7) {
    throw new Error('Invalid color.')
  }
  const r = lobbyRef(code)
  const result = await runTransaction(r, (current: LobbyState | null) => {
    if (!current) return current
    if (current.hostId !== hostId) return
    if (current.status !== 'waiting') return
    if (!current.players[playerId]) return

    const taken = Object.entries(current.players).some(
      ([id, p]) => id !== playerId && p.colorIndex === colorIndex,
    )
    if (taken) return

    return {
      ...current,
      players: {
        ...current.players,
        [playerId]: {
          ...current.players[playerId]!,
          colorIndex,
        },
      },
    }
  })
  if (!result.committed) {
    throw new Error('Color is already taken, or only the host can assign colors before the game starts.')
  }
}

export async function updateLobbySettings(
  code: string,
  uid: string,
  settings: LobbySettings,
): Promise<void> {
  const r = lobbyRef(code)
  const snap = await get(r)
  const lobby = snap.val() as LobbyState | null
  if (!lobby || lobby.hostId !== uid || lobby.status !== 'waiting') {
    throw new Error('Only the host can change settings before the game starts.')
  }
  await update(r, { settings })
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

    const fresh = createGame(current.settings.dots, current.seatOrder.length)
    const game = withTurnClock({
      lines: {},
      boxes: {},
      scores: fresh.scores,
      turnIndex: 0,
      moveCount: 0,
      finished: false,
      skipPenalties: fresh.skipPenalties,
    })
    return {
      ...current,
      status: 'playing',
      game,
    }
  }).then((res) => {
    if (!res.committed) throw new Error('Could not start. Need at least 2 players and host permission.')
  })
}

export async function submitOnlineMove(
  code: string,
  uid: string,
  nextGame: Omit<LobbyGame, 'turnStartedAt'> & { turnStartedAt?: number },
  edgeId: string,
  expectedMoveCount: number,
): Promise<void> {
  const r = lobbyRef(code)
  await runTransaction(r, (current: LobbyState | null) => {
    if (!current || current.status !== 'playing' || !current.game) return
    if (current.game.moveCount !== expectedMoveCount) return
    if (current.game.finished) return
    const seat = current.seatOrder[current.game.turnIndex]
    if (seat !== uid) return
    if (current.game.lines[edgeId] !== undefined) return

    const status = nextGame.finished ? 'finished' : 'playing'
    return {
      ...current,
      status,
      game: withTurnClock({
        lines: nextGame.lines,
        boxes: nextGame.boxes,
        scores: nextGame.scores,
        turnIndex: nextGame.turnIndex,
        moveCount: nextGame.moveCount,
        finished: nextGame.finished,
        skipPenalties: nextGame.skipPenalties ?? current.game.skipPenalties ?? [],
      }),
    }
  }).then((res) => {
    if (!res.committed) throw new Error('Move rejected (not your turn, stale state, or line taken).')
  })
}

/** Timer expiry: end turn + queue one extra skipped turn (no line placed). */
export async function applyTimeoutOnlineTurn(
  code: string,
  expectedMoveCount: number,
): Promise<void> {
  const r = lobbyRef(code)
  await runTransaction(r, (current: LobbyState | null) => {
    if (!current || current.status !== 'playing' || !current.game) return
    if (current.game.finished) return
    if (current.game.moveCount !== expectedMoveCount) return

    const turnSeconds = current.settings.turnSeconds ?? 0
    if (!turnSeconds || turnSeconds <= 0) return

    const started = current.game.turnStartedAt ?? 0
    if (!started || Date.now() < started + turnSeconds * 1000) return

    const state = {
      dots: current.settings.dots,
      lines: current.game.lines,
      boxes: current.game.boxes,
      scores: current.game.scores,
      turnIndex: current.game.turnIndex,
      moveCount: current.game.moveCount,
      finished: current.game.finished,
      playerCount: current.seatOrder.length,
      skipPenalties: current.game.skipPenalties ?? [],
    }
    const next = applyTimeoutPenalty(state)
    if (!next) return

    return {
      ...current,
      game: withTurnClock({
        lines: next.lines,
        boxes: next.boxes,
        scores: next.scores,
        turnIndex: next.turnIndex,
        moveCount: next.moveCount,
        finished: next.finished,
        skipPenalties: next.skipPenalties,
      }),
    }
  })
}

export async function resetLobbyGame(code: string, uid: string): Promise<void> {
  const r = lobbyRef(code)
  await runTransaction(r, (current: LobbyState | null) => {
    if (!current) return current
    if (current.hostId !== uid) return
    if (current.seatOrder.length < 2) return

    const fresh = createGame(current.settings.dots, current.seatOrder.length)
    return {
      ...current,
      status: 'playing',
      game: withTurnClock({
        lines: {},
        boxes: {},
        scores: fresh.scores,
        turnIndex: 0,
        moveCount: 0,
        finished: false,
        skipPenalties: fresh.skipPenalties,
      }),
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
    onData(snap.exists() ? (snap.val() as LobbyState) : null)
  })
}
