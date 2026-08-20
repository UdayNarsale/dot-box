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
  }
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
  if (!finished && !bonusTurn) {
    turnIndex = (turnIndex + 1) % state.playerCount
  }

  return {
    state: {
      ...state,
      lines,
      boxes,
      scores,
      turnIndex,
      moveCount: state.moveCount + 1,
      finished,
    },
    closedBoxes,
    bonusTurn,
  }
}

/** All undrawn legal edges on the board. */
export function availableEdges(state: GameState): EdgeId[] {
  return allEdgeIds(state.dots).filter((id) => state.lines[id] === undefined)
}

/** Timer expiry: place a line on a random open edge for the current player. */
export function placeRandomLine(state: GameState): PlaceLineResult | null {
  if (state.finished) return null
  const open = availableEdges(state)
  if (open.length === 0) return null
  const pick = open[Math.floor(Math.random() * open.length)]!
  return placeLine(state, pick)
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
    lines: Record<string, number>
    boxes: Record<string, number>
    scores: number[]
    turnIndex: number
    moveCount: number
    finished: boolean
  },
): GameState {
  return {
    dots: clampDots(dots),
    playerCount: clampPlayers(playerCount),
    lines: partial.lines ?? {},
    boxes: partial.boxes ?? {},
    scores: partial.scores,
    turnIndex: partial.turnIndex,
    moveCount: partial.moveCount,
    finished: partial.finished,
  }
}
