export const MIN_DOTS = 5
export const MAX_DOTS = 16
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 8
export const MIN_TURN_SECONDS = 5
export const MAX_TURN_SECONDS = 600
/** Preset turn lengths in seconds (host dropdown). */
export const TURN_TIMER_PRESETS = [10, 30, 45, 60] as const

export const PLAYER_COLORS = [
  { id: 0, name: 'Blue', stroke: '#2563eb', fill: 'rgba(37, 99, 235, 0.28)' },
  { id: 1, name: 'Red', stroke: '#dc2626', fill: 'rgba(220, 38, 38, 0.28)' },
  { id: 2, name: 'Emerald', stroke: '#059669', fill: 'rgba(5, 150, 105, 0.28)' },
  { id: 3, name: 'Amber', stroke: '#d97706', fill: 'rgba(217, 119, 6, 0.28)' },
  { id: 4, name: 'Violet', stroke: '#7c3aed', fill: 'rgba(124, 58, 237, 0.28)' },
  { id: 5, name: 'Cyan', stroke: '#0891b2', fill: 'rgba(8, 145, 178, 0.28)' },
  { id: 6, name: 'Rose', stroke: '#e11d48', fill: 'rgba(225, 29, 72, 0.28)' },
  { id: 7, name: 'Lime', stroke: '#65a30d', fill: 'rgba(101, 163, 13, 0.28)' },
] as const

export type EdgeOrientation = 'h' | 'v'

/** Horizontal: h-r-c connects (r,c)-(r,c+1). Vertical: v-r-c connects (r,c)-(r+1,c). */
export type EdgeId = `h-${number}-${number}` | `v-${number}-${number}`

export interface Player {
  id: string
  name: string
  colorIndex: number
}

export interface GameState {
  dots: number
  lines: Record<string, number>
  boxes: Record<string, number>
  scores: number[]
  turnIndex: number
  moveCount: number
  finished: boolean
  playerCount: number
  /** Extra turns each seat still owes after a timeout (skip next turn penalty). */
  skipPenalties: number[]
}

export interface PlaceLineResult {
  state: GameState
  closedBoxes: string[]
  bonusTurn: boolean
}

export type LobbyStatus = 'waiting' | 'playing' | 'finished'

export interface LobbySettings {
  dots: number
  maxPlayers: number
  /** Seconds per turn; 0 = timer off. */
  turnSeconds: number
}

export interface LobbyPlayer {
  name: string
  colorIndex: number
  joinedAt: number
}

export interface LobbyGame {
  lines: Record<string, number>
  boxes: Record<string, number>
  scores: number[]
  turnIndex: number
  moveCount: number
  finished: boolean
  /** Epoch ms when the current turn clock started. */
  turnStartedAt: number
  /** Extra turns each seat still owes after a timeout. */
  skipPenalties: number[]
}

export interface LobbyState {
  hostId: string
  status: LobbyStatus
  settings: LobbySettings
  players: Record<string, LobbyPlayer>
  seatOrder: string[]
  game: LobbyGame | null
  createdAt: number
}

export type AppMode = 'menu' | 'local' | 'online-create' | 'online-join' | 'online-play'
