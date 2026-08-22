export const MIN_DOTS = 5
export const MAX_DOTS = 16
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 8
export const MIN_TURN_SECONDS = 5
export const MAX_TURN_SECONDS = 600
/** Preset turn lengths in seconds (host dropdown). */
export const TURN_TIMER_PRESETS = [10, 30, 45, 60] as const

/**
 * 20 player colors tuned for LCD + color-vision deficiency.
 * One hue per family (single purple, no olive/chartreuse/teal/jade overlap),
 * with lightness spread within green–cyan so adjacent picks stay distinguishable.
 */
export const PLAYER_COLORS = [
  { id: 0, name: 'Red', stroke: '#E6194B', fill: 'rgba(230, 25, 75, 0.28)' },
  { id: 1, name: 'Green', stroke: '#3CB44B', fill: 'rgba(60, 180, 75, 0.28)' },
  { id: 2, name: 'Amber', stroke: '#E5A100', fill: 'rgba(229, 161, 0, 0.28)' },
  { id: 3, name: 'Blue', stroke: '#1976D2', fill: 'rgba(25, 118, 210, 0.28)' },
  { id: 4, name: 'Orange', stroke: '#F58231', fill: 'rgba(245, 130, 49, 0.28)' },
  { id: 5, name: 'Purple', stroke: '#911EB4', fill: 'rgba(145, 30, 180, 0.28)' },
  { id: 6, name: 'Cyan', stroke: '#00ACC1', fill: 'rgba(0, 172, 193, 0.28)' },
  { id: 7, name: 'Magenta', stroke: '#C2185B', fill: 'rgba(194, 24, 91, 0.28)' },
  { id: 8, name: 'Lime', stroke: '#AFB42B', fill: 'rgba(175, 180, 43, 0.28)' },
  { id: 9, name: 'Pink', stroke: '#D45087', fill: 'rgba(212, 80, 135, 0.28)' },
  { id: 10, name: 'Pine', stroke: '#0F5132', fill: 'rgba(15, 81, 50, 0.28)' },
  { id: 11, name: 'Violet', stroke: '#512DA8', fill: 'rgba(81, 45, 168, 0.28)' },
  { id: 12, name: 'Tan', stroke: '#B8956A', fill: 'rgba(184, 149, 106, 0.28)' },
  { id: 13, name: 'Brick', stroke: '#C0392B', fill: 'rgba(192, 57, 43, 0.28)' },
  { id: 14, name: 'Maroon', stroke: '#800000', fill: 'rgba(128, 0, 0, 0.28)' },
  { id: 15, name: 'Forest', stroke: '#2E7D32', fill: 'rgba(46, 125, 50, 0.28)' },
  { id: 16, name: 'Espresso', stroke: '#5D4037', fill: 'rgba(93, 64, 55, 0.28)' },
  { id: 17, name: 'Lemon', stroke: '#FFF44F', fill: 'rgba(255, 244, 79, 0.28)' },
  { id: 18, name: 'Navy', stroke: '#000075', fill: 'rgba(0, 0, 117, 0.28)' },
  { id: 19, name: 'Slate', stroke: '#595959', fill: 'rgba(89, 89, 89, 0.28)' },
] as const

export const MAX_COLOR_INDEX = PLAYER_COLORS.length - 1

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
  /** Firebase uid of the player whose turn it is (avoids parent reads in game transactions). */
  turnPlayerId?: string
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

export type AppMode = 'menu' | 'settings' | 'local' | 'online-create' | 'online-join' | 'online-play'
