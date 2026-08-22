import { useEffect } from 'react'
import { requestGameBgm } from '../audio/bgm'
import type { GameState } from '../types/game'

/** Phased in-game BGM; overrides ambient while a match is in progress. */
export function useGameMusic(active: boolean, game: GameState | null | undefined) {
  const finished = game?.finished ?? true
  const dots = game?.dots ?? 0
  const moveCount = game?.moveCount ?? 0

  useEffect(() => {
    requestGameBgm(active && !finished, active && !finished ? game ?? null : null)
    return () => requestGameBgm(false, null)
  }, [active, finished, dots])

  useEffect(() => {
    if (active && game && !finished) {
      requestGameBgm(true, game)
    }
  }, [active, finished, moveCount, dots, game])
}
