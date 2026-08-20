import { useCallback, useEffect, useRef, useState } from 'react'
import { playMoveSound, playWinSound } from '../audio/sfx'
import { gameFromLobby, placeLine, winners } from '../engine/gameEngine'
import { isFirebaseConfigured } from '../firebase/config'
import {
  createLobby,
  deleteLobby,
  joinLobby,
  leaveLobby,
  resetLobbyGame,
  setPlayerColor,
  applyTimeoutOnlineTurn,
  startLobbyGame,
  submitOnlineMove,
  subscribeLobby,
  updateLobbySettings,
} from '../firebase/lobby'
import type { LobbySettings, LobbyState } from '../types/game'

export function useOnlineLobby() {
  const [code, setCode] = useState<string | null>(null)
  const [uid, setUid] = useState<string | null>(null)
  const [lobby, setLobby] = useState<LobbyState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  /** Move counts we already played SFX for (self submit or remote hear). */
  const heardMoveRef = useRef(0)
  const lastBoxCountRef = useRef(0)
  const lastLineCountRef = useRef(0)
  const selfMoveRef = useRef(0)

  useEffect(() => {
    if (!code) {
      setLobby(null)
      return
    }
    const unsub = subscribeLobby(code, setLobby)
    return unsub
  }, [code])

  // Reset audio tracking when lobby code changes or game restarts to move 0.
  useEffect(() => {
    heardMoveRef.current = 0
    lastBoxCountRef.current = 0
    lastLineCountRef.current = 0
    selfMoveRef.current = 0
  }, [code])

  // Opponent (and any missed) move SFX from realtime snapshots.
  useEffect(() => {
    const game = lobby?.game
    if (!game || !uid || lobby.status === 'waiting') return

    if (game.moveCount === 0) {
      heardMoveRef.current = 0
      lastBoxCountRef.current = Object.keys(game.boxes).length
      lastLineCountRef.current = Object.keys(game.lines).length
      selfMoveRef.current = 0
      return
    }

    if (game.moveCount <= heardMoveRef.current) return

    const boxCount = Object.keys(game.boxes).length
    const lineCount = Object.keys(game.lines).length
    const closedBoxes = boxCount > lastBoxCountRef.current
    const placedLine = lineCount > lastLineCountRef.current
    const isSelf = game.moveCount === selfMoveRef.current

    // Timeout penalties don't place a line — skip move SFX.
    if (!isSelf && placedLine) {
      void playMoveSound({ isSelf: false, closedBoxes })
      if (game.finished) void playWinSound()
    } else if (!isSelf && game.finished) {
      void playWinSound()
    }

    heardMoveRef.current = game.moveCount
    lastBoxCountRef.current = boxCount
    lastLineCountRef.current = lineCount
  }, [lobby?.game, lobby?.status, uid])

  const create = useCallback(async (settings: LobbySettings, hostName: string) => {
    if (!isFirebaseConfigured()) {
      setError('Firebase is not configured. Add VITE_FIREBASE_* env vars to enable online play.')
      return null
    }
    setBusy(true)
    setError(null)
    try {
      const res = await createLobby(settings, hostName)
      setCode(res.code)
      setUid(res.uid)
      return res
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create lobby')
      return null
    } finally {
      setBusy(false)
    }
  }, [])

  const join = useCallback(async (joinCode: string, name: string) => {
    if (!isFirebaseConfigured()) {
      setError('Firebase is not configured. Add VITE_FIREBASE_* env vars to enable online play.')
      return null
    }
    setBusy(true)
    setError(null)
    try {
      const res = await joinLobby(joinCode, name)
      setCode(res.code)
      setUid(res.uid)
      return res
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join lobby')
      return null
    } finally {
      setBusy(false)
    }
  }, [])

  const leave = useCallback(async () => {
    if (!code || !uid) return
    setBusy(true)
    try {
      await leaveLobby(code, uid)
    } catch {
      /* ignore */
    } finally {
      setCode(null)
      setUid(null)
      setLobby(null)
      setBusy(false)
    }
  }, [code, uid])

  const endLobby = useCallback(async () => {
    if (!code || !uid) return
    setBusy(true)
    try {
      await deleteLobby(code, uid)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to end lobby')
    } finally {
      setCode(null)
      setUid(null)
      setLobby(null)
      setBusy(false)
    }
  }, [code, uid])

  const saveSettings = useCallback(
    async (settings: LobbySettings) => {
      if (!code || !uid) return
      try {
        await updateLobbySettings(code, uid, settings)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update settings')
      }
    },
    [code, uid],
  )

  const assignColor = useCallback(
    async (playerId: string, colorIndex: number) => {
      if (!code || !uid) return
      try {
        await setPlayerColor(code, uid, playerId, colorIndex)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to set color')
      }
    },
    [code, uid],
  )

  const start = useCallback(async () => {
    if (!code || !uid) return
    setBusy(true)
    setError(null)
    try {
      await startLobbyGame(code, uid)
      heardMoveRef.current = 0
      lastBoxCountRef.current = 0
      lastLineCountRef.current = 0
      selfMoveRef.current = 0
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start')
    } finally {
      setBusy(false)
    }
  }, [code, uid])

  const playAgain = useCallback(async () => {
    if (!code || !uid) return
    setBusy(true)
    try {
      await resetLobbyGame(code, uid)
      heardMoveRef.current = 0
      lastBoxCountRef.current = 0
      lastLineCountRef.current = 0
      selfMoveRef.current = 0
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to restart')
    } finally {
      setBusy(false)
    }
  }, [code, uid])

  const playEdge = useCallback(
    async (edgeId: string) => {
      if (!code || !uid || !lobby?.game || lobby.status !== 'playing') return false
      const seat = lobby.seatOrder[lobby.game.turnIndex]
      if (seat !== uid) return false

      const state = gameFromLobby(lobby.settings.dots, lobby.seatOrder.length, lobby.game)
      const result = placeLine(state, edgeId)
      if (!result) return false

      try {
        await submitOnlineMove(
          code,
          uid,
          {
            lines: result.state.lines,
            boxes: result.state.boxes,
            scores: result.state.scores,
            turnIndex: result.state.turnIndex,
            moveCount: result.state.moveCount,
            finished: result.state.finished,
            skipPenalties: result.state.skipPenalties,
          },
          edgeId,
          lobby.game.moveCount,
        )
        selfMoveRef.current = result.state.moveCount
        heardMoveRef.current = result.state.moveCount
        lastBoxCountRef.current = Object.keys(result.state.boxes).length
        lastLineCountRef.current = Object.keys(result.state.lines).length
        await playMoveSound({
          isSelf: true,
          closedBoxes: result.closedBoxes.length > 0,
        })
        if (result.state.finished) await playWinSound()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Move failed')
        return false
      }
    },
    [code, uid, lobby],
  )

  const expireTurn = useCallback(async () => {
    if (!code || !lobby?.game || lobby.status !== 'playing') return false
    if (lobby.game.finished) return false
    const turnSeconds = lobby.settings.turnSeconds ?? 0
    if (!turnSeconds) return false
    try {
      await applyTimeoutOnlineTurn(code, lobby.game.moveCount)
      return true
    } catch {
      return false
    }
  }, [code, lobby])

  const gameState =
    lobby?.game && lobby.settings
      ? gameFromLobby(lobby.settings.dots, lobby.seatOrder.length, lobby.game)
      : null

  const winnerIndices = gameState ? winners(gameState) : []

  return {
    configured: isFirebaseConfigured(),
    code,
    uid,
    lobby,
    game: gameState,
    winnerIndices,
    error,
    busy,
    setError,
    create,
    join,
    leave,
    endLobby,
    saveSettings,
    assignColor,
    start,
    playAgain,
    playEdge,
    expireTurn,
  }
}
