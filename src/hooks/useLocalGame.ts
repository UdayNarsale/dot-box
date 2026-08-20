import { useCallback, useReducer, useRef } from 'react'
import { playMoveSound, playWinSound } from '../audio/sfx'
import { createGame, placeLine, placeRandomLine, winners } from '../engine/gameEngine'
import type { GameState, Player } from '../types/game'
import { PLAYER_COLORS } from '../types/game'

type LocalAction =
  | { type: 'reset'; dots: number; players: Player[]; turnSeconds: number }
  | { type: 'apply'; game: GameState; turnStartedAt: number }

interface LocalState {
  players: Player[]
  game: GameState
  turnSeconds: number
  turnStartedAt: number
}

function reducer(state: LocalState, action: LocalAction): LocalState {
  if (action.type === 'reset') {
    return {
      players: action.players,
      game: createGame(action.dots, action.players.length),
      turnSeconds: action.turnSeconds,
      turnStartedAt: Date.now(),
    }
  }
  return { ...state, game: action.game, turnStartedAt: action.turnStartedAt }
}

function defaultPlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `local-${i}`,
    name: `Player ${i + 1}`,
    colorIndex: i % PLAYER_COLORS.length,
  }))
}

export function useLocalGame(initialDots = 5, initialPlayers = 2) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    players: defaultPlayers(initialPlayers),
    game: createGame(initialDots, initialPlayers),
    turnSeconds: 0,
    turnStartedAt: Date.now(),
  }))
  const stateRef = useRef(state)
  stateRef.current = state
  const locking = useRef(false)

  const restart = useCallback((dots: number, players: Player[], turnSeconds = 0) => {
    dispatch({ type: 'reset', dots, players, turnSeconds })
  }, [])

  const playEdge = useCallback(async (edgeId: string) => {
    if (locking.current) return false
    locking.current = true
    try {
      const before = stateRef.current.game
      const result = placeLine(before, edgeId)
      if (!result) return false
      const turnStartedAt = Date.now()
      dispatch({ type: 'apply', game: result.state, turnStartedAt })
      stateRef.current = {
        ...stateRef.current,
        game: result.state,
        turnStartedAt,
      }
      await playMoveSound({
        isSelf: true,
        closedBoxes: result.closedBoxes.length > 0,
      })
      if (result.state.finished) await playWinSound()
      return true
    } finally {
      locking.current = false
    }
  }, [])

  const expireTurn = useCallback(async () => {
    if (locking.current) return false
    const before = stateRef.current.game
    if (before.finished) return false
    const result = placeRandomLine(before)
    if (!result) return false
    locking.current = true
    try {
      const turnStartedAt = Date.now()
      dispatch({ type: 'apply', game: result.state, turnStartedAt })
      stateRef.current = { ...stateRef.current, game: result.state, turnStartedAt }
      await playMoveSound({
        isSelf: true,
        closedBoxes: result.closedBoxes.length > 0,
      })
      if (result.state.finished) await playWinSound()
      return true
    } finally {
      locking.current = false
    }
  }, [])

  return {
    players: state.players,
    game: state.game,
    turnSeconds: state.turnSeconds,
    turnStartedAt: state.turnStartedAt,
    winnerIndices: winners(state.game),
    restart,
    playEdge,
    expireTurn,
    defaultPlayers,
  }
}
