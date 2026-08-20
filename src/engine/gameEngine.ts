import type { EdgeId, GameState, PlaceLineResult } from '../types/game'
import { MAX_DOTS, MAX_PLAYERS, MIN_DOTS, MIN_PLAYERS } from '../types/game'

export function clampDots(dots: number): number {
  return Math.min(MAX_DOTS, Math.max(MIN_DOTS, Math.floor(dots)))
}

export function clampPlayers(n: number): number {
  return Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Math.floor(n)))
}

export function boxCount(dots: number): number {
  const d = clampDots(dots)
  return (d - 1) * (d - 1)
}

export function createGame(dots: number, playerCount: number): GameState {
  const d = clampDots(dots)
  const p = clampPlayers(playerCount)
  return {
    dots: d,
    lines: {},
    boxes: {},
    scores: Array.from({ length: p }, () => 0),
    turnIndex: 0,
    moveCount: 0,
    finished: false,
    playerCount: p,
    skipPenalties: Array.from({ length: p }, () => 0),
  }
}

function normalizePenalties(state: GameState): number[] {
  const p = [...(state.skipPenalties ?? [])]
  while (p.length < state.playerCount) p.push(0)
  return p.slice(0, state.playerCount)
}

/** Advance turnIndex while burning owed skip penalties. */
export function consumeSkipPenalties(
  turnIndex: number,
  skipPenalties: number[],
  playerCount: number,
): { turnIndex: number; skipPenalties: number[] } {
  const penalties = [...skipPenalties]
  let t = ((turnIndex % playerCount) + playerCount) % playerCount
  for (let i = 0; i < playerCount * 4; i++) {
    if ((penalties[t] ?? 0) <= 0) break
    penalties[t]! -= 1
    t = (t + 1) % playerCount
  }
  return { turnIndex: t, skipPenalties: penalties }
}

export function hEdge(r: number, c: number): EdgeId {
  return `h-${r}-${c}`
}

export function vEdge(r: number, c: number): EdgeId {
  return `v-${r}-${c}`
}

export function parseEdgeId(id: string): { orient: 'h' | 'v'; r: number; c: number } | null {
  const m = /^(h|v)-(\d+)-(\d+)$/.exec(id)
  if (!m) return null
  return { orient: m[1] as 'h' | 'v', r: Number(m[2]), c: Number(m[3]) }
}

export function isValidEdge(dots: number, edgeId: string): boolean {
  const parsed = parseEdgeId(edgeId)
  if (!parsed) return false
  const { orient, r, c } = parsed
  if (orient === 'h') {
    return r >= 0 && r < dots && c >= 0 && c < dots - 1
  }
  return r >= 0 && r < dots - 1 && c >= 0 && c < dots
}

export function allEdgeIds(dots: number): EdgeId[] {
  const edges: EdgeId[] = []
  for (let r = 0; r < dots; r++) {
    for (let c = 0; c < dots - 1; c++) {
      edges.push(hEdge(r, c))
    }
  }
  for (let r = 0; r < dots - 1; r++) {
    for (let c = 0; c < dots; c++) {
      edges.push(vEdge(r, c))
    }
  }
  return edges
}

function boxKey(r: number, c: number): string {
  return `${r}-${c}`
}

function boxEdges(r: number, c: number): EdgeId[] {
  return [hEdge(r, c), hEdge(r + 1, c), vEdge(r, c), vEdge(r, c + 1)]
}

function isBoxComplete(lines: Record<string, number>, r: number, c: number): boolean {
  return boxEdges(r, c).every((e) => lines[e] !== undefined)
}

/** Boxes that touch a given edge. */
function boxesTouchedByEdge(dots: number, edgeId: string): Array<{ r: number; c: number }> {
  const parsed = parseEdgeId(edgeId)
  if (!parsed) return []
  const { orient, r, c } = parsed
  const boxes: Array<{ r: number; c: number }> = []
  const max = dots - 1

  if (orient === 'h') {
    if (r > 0 && r <= max && c < max) boxes.push({ r: r - 1, c })
    if (r < max && c < max) boxes.push({ r, c })
  } else {
    if (c > 0 && c <= max && r < max) boxes.push({ r, c: c - 1 })
    if (c < max && r < max) boxes.push({ r, c })
  }
  return boxes
}

export function placeLine(state: GameState, edgeId: string): PlaceLineResult | null {
  if (state.finished) return null
  if (!isValidEdge(state.dots, edgeId)) return null
  if (state.lines[edgeId] !== undefined) return null

  const playerIndex = state.turnIndex
  const lines = { ...state.lines, [edgeId]: playerIndex }
  const boxes = { ...state.boxes }
  const scores = [...state.scores]
  const closedBoxes: string[] = []

  for (const { r, c } of boxesTouchedByEdge(state.dots, edgeId)) {
    const key = boxKey(r, c)
    if (boxes[key] !== undefined) continue
    if (isBoxComplete(lines, r, c)) {
      boxes[key] = playerIndex
      scores[playerIndex] += 1
      closedBoxes.push(key)
    }
  }

  const bonusTurn = closedBoxes.length > 0
  const totalBoxes = boxCount(state.dots)
  const claimed = Object.keys(boxes).length
  const finished = claimed >= totalBoxes

  let turnIndex = state.turnIndex
  let skipPenalties = normalizePenalties(state)
  // Bonus turn: same player keeps the turn — timer resets via turnStartedAt at the call site.
  if (!finished && !bonusTurn) {
    const advanced = consumeSkipPenalties(
      (turnIndex + 1) % state.playerCount,
      skipPenalties,
      state.playerCount,
    )
    turnIndex = advanced.turnIndex
    skipPenalties = advanced.skipPenalties
  }

  return {
    state: {
      ...state,
      lines,
      boxes,
      scores,
      turnIndex,
      skipPenalties,
      moveCount: state.moveCount + 1,
      finished,
    },
    closedBoxes,
    bonusTurn,
  }
}

/**
 * Timer expiry: no line drawn.
 * Ends the current turn and queues one extra skipped turn for that player
 * (they miss this turn and their next one).
 */
export function applyTimeoutPenalty(state: GameState): GameState | null {
  if (state.finished) return null

  const timedOut = state.turnIndex
  const skipPenalties = normalizePenalties(state)
  skipPenalties[timedOut] = (skipPenalties[timedOut] ?? 0) + 1

  const advanced = consumeSkipPenalties(
    (timedOut + 1) % state.playerCount,
    skipPenalties,
    state.playerCount,
  )

  return {
    ...state,
    turnIndex: advanced.turnIndex,
    skipPenalties: advanced.skipPenalties,
    moveCount: state.moveCount + 1,
  }
}

export function clampTurnSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0
  return Math.min(600, Math.max(5, Math.floor(seconds)))
}

export function winners(state: GameState): number[] {
  if (!state.finished) return []
  const max = Math.max(...state.scores)
  return state.scores
    .map((s, i) => (s === max ? i : -1))
    .filter((i) => i >= 0)
}

export function gameFromLobby(
  dots: number,
  playerCount: number,
  partial: {
    lines?: Record<string, number> | null
    boxes?: Record<string, number> | null
    scores: number[] | Record<string, number>
    turnIndex: number
    moveCount: number
    finished: boolean
    skipPenalties?: number[] | Record<string, number> | null
  },
): GameState {
  const p = clampPlayers(playerCount)
  const scores = toNumberArray(partial.scores, p, 0)
  const skipPenalties = toNumberArray(partial.skipPenalties, p, 0)
  return {
    dots: clampDots(dots),
    playerCount: p,
    lines: sanitizeEdgeMap(partial.lines),
    boxes: sanitizeEdgeMap(partial.boxes),
    scores,
    turnIndex: Number(partial.turnIndex) || 0,
    moveCount: Number(partial.moveCount) || 0,
    finished: Boolean(partial.finished),
    skipPenalties,
  }
}

/** Firebase may return arrays as objects with numeric keys. */
function toNumberArray(
  value: number[] | Record<string, number> | null | undefined,
  length: number,
  fill: number,
): number[] {
  const out = Array.from({ length }, () => fill)
  if (value == null) return out
  if (Array.isArray(value)) {
    for (let i = 0; i < length; i++) out[i] = Number(value[i] ?? fill) || fill
    return out
  }
  for (let i = 0; i < length; i++) {
    out[i] = Number(value[String(i)] ?? value[i as unknown as string] ?? fill) || fill
  }
  return out
}

function sanitizeEdgeMap(
  value: Record<string, number> | null | undefined,
): Record<string, number> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(value)) {
    if (k.startsWith('_')) continue
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  }
  return out
}

/** Normalize seatOrder whether Firebase returns an array or object. */
export function toStringList(value: string[] | Record<string, string> | null | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  return Object.keys(value)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => value[k]!)
    .filter(Boolean)
}
