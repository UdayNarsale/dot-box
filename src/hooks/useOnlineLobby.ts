import { useCallback, useEffect, useRef, useState } from 'react'
import { playMoveSound, playWinSound } from '../audio/sfx'
import { gameFromLobby, placeLine, winners } from '../engine/gameEngine'
import { isFirebaseConfigured } from '../firebase/config'
import {
  createLobby,
  deleteLobby,
  joinLobby,
  leaveLobby,
  kickLobbyPlayer,
  returnLobbyToWaiting,
  reconnectLobby,
  resetLobbyGame,
  setPlayerColor,
  setPlayerReady,
  applyTimeoutOnlineTurn,
  startLobbyGame,
  submitOnlineMove,
  subscribeLobby,
  updateLobbySettings,
} from '../firebase/lobby'
import { clearSession, loadSession, saveSession } from '../firebase/session'
import type { LobbySettings, LobbyState } from '../types/game'

export function useOnlineLobby() {
  const [code, setCode] = useState<string | null>(null)
  const [uid, setUid] = useState<string | null>(null)
  const [lobby, setLobby] = useState<LobbyState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [restoring, setRestoring] = useState(
    () => Boolean(loadSession()) && isFirebaseConfigured(),
  )

  /** Move counts we already played SFX for (self submit or remote hear). */
  const heardMoveRef = useRef(0)
  const lastBoxCountRef = useRef(0)
  const lastLineCountRef = useRef(0)
  const selfMoveRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    async function restore() {
      const session = loadSession()
      if (!session || !isFirebaseConfigured()) {
        setRestoring(false)
        return
      }
      try {
        const res = await reconnectLobby(session.code)
        if (cancelled) return
        if (res) {
          setCode(res.code)
          setUid(res.uid)
        } else {
          clearSession()
        }
      } catch {
        if (!cancelled) clearSession()
      } finally {
        if (!cancelled) setRestoring(false)
      }
    }
    void restore()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!code) {
      setLobby(null)
      return
    }
    const unsub = subscribeLobby(code, setLobby)
    return unsub
  }, [code])

  /** Lobby deleted or this player was kicked — clear local session. */
  useEffect(() => {
    if (!code || restoring) return
    if (lobby === null) {
      clearSession()
      setCode(null)
      setUid(null)
      return
    }
    if (uid && !lobby.players[uid]) {
      clearSession()
      setCode(null)
      setUid(null)
      setLobby(null)
      setError('You were removed from the lobby.')
    }
  }, [lobby, code, uid, restoring])

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
      lastBoxCountRef.current = Object.keys(game.boxes ?? {}).length
      lastLineCountRef.current = Object.keys(game.lines ?? {}).length
      selfMoveRef.current = 0
      return
    }

    if (game.moveCount <= heardMoveRef.current) return

    const boxCount = Object.keys(game.boxes ?? {}).length
    const lineCount = Object.keys(game.lines ?? {}).length
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
      saveSession({ code: res.code, name: hostName.trim() || 'Host', intent: 'create' })
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
      saveSession({ code: res.code, name: name.trim(), intent: 'join' })
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
      clearSession()
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
      clearSession()
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
    async (colorIndex: number) => {
      if (!code || !uid) return
      try {
        await setPlayerColor(code, uid, colorIndex)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to set color')
      }
    },
    [code, uid],
  )

  const setReady = useCallback(
    async (ready: boolean) => {
      if (!code || !uid) return
      try {
        await setPlayerReady(code, uid, ready)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update ready status')
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

  const returnToLobby = useCallback(async () => {
    if (!code || !uid) return
    setBusy(true)
    setError(null)
    try {
      await returnLobbyToWaiting(code, uid)
      heardMoveRef.current = 0
      lastBoxCountRef.current = 0
      lastLineCountRef.current = 0
      selfMoveRef.current = 0
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to return to waiting room')
    } finally {
      setBusy(false)
    }
  }, [code, uid])

  const kickPlayer = useCallback(
    async (targetUid: string) => {
      if (!code || !uid) return
      try {
        await kickLobbyPlayer(code, uid, targetUid)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to remove player')
      }
    },
    [code, uid],
  )

  const playEdge = useCallback(
    async (edgeId: string) => {
      if (!code || !uid || !lobby?.game || lobby.status !== 'playing') return false
      const seat = lobby.seatOrder[lobby.game.turnIndex]
      if (seat !== uid) return false

      const state = gameFromLobby(lobby.settings.dots, lobby.seatOrder.length, lobby.game)
      const result = placeLine(state, edgeId)
      if (!result) return false

      try {
        const nextTurnPlayerId = lobby.seatOrder[result.state.turnIndex]!
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
          nextTurnPlayerId,
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
    restoring,
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
    setReady,
    start,
    playAgain,
    returnToLobby,
    kickPlayer,
    playEdge,
    expireTurn,
  }
}
