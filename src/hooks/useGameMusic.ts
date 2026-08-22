import { useEffect } from 'react'
import { computeMusicPhase, startBgm, stopBgm, updateBgmPhase } from '../audio/bgm'
import { isMusicEnabled, subscribeGamePreferences } from '../preferences/gamePreferences'
import type { GameState } from '../types/game'

/** Procedural BGM while a game board is active. Respects the Music setting. */
export function useGameMusic(active: boolean, game: GameState | null | undefined) {
  const finished = game?.finished ?? true
  const dots = game?.dots ?? 0
  const moveCount = game?.moveCount ?? 0

  useEffect(() => {
    if (!active || !game || finished) {
      stopBgm()
      return
    }
    if (!isMusicEnabled()) {
      stopBgm()
      return
    }
    const phase = computeMusicPhase(game)
    if (!phase) {
      stopBgm()
      return
    }
    void startBgm(phase)
    return () => stopBgm()
  }, [active, finished, dots])

  useEffect(() => {
    if (!active || !game || finished || !isMusicEnabled()) return
    const phase = computeMusicPhase(game)
    if (phase) updateBgmPhase(phase)
  }, [active, finished, moveCount, dots])

  useEffect(() => {
    return subscribeGamePreferences(() => {
      if (!isMusicEnabled()) {
        stopBgm()
        return
      }
      if (active && game && !finished) {
        const phase = computeMusicPhase(game)
        if (phase) void startBgm(phase)
      }
    })
  }, [active, finished, dots, moveCount])
}
