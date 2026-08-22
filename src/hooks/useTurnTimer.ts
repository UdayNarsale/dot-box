import { useEffect, useRef, useState } from 'react'

interface UseTurnTimerOptions {
  /** 0 or undefined = timer off */
  turnSeconds: number
  /** Server/local clock start for this turn (epoch ms). */
  turnStartedAt: number | null
  /** Changes when the active turn identity changes (e.g. turnIndex-moveCount). */
  turnKey: string
  finished: boolean
  onExpire: () => void
  /** When false, onExpire runs only via fallback (opponent's turn). Default true. */
  canExpire?: boolean
  /** Delay before a non-active client applies timeout (opponent disconnect fallback). */
  fallbackExpireMs?: number
}

export function useTurnTimer({
  turnSeconds,
  turnStartedAt,
  turnKey,
  finished,
  onExpire,
  canExpire = true,
  fallbackExpireMs = 2500,
}: UseTurnTimerOptions) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const expiredKeyRef = useRef<string | null>(null)
  /** True once this turn tick showed meaningful time left (avoids instant expire on stale clocks). */
  const sawRunningRef = useRef(false)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire
  const turnEpochRef = useRef(`${turnKey}:${turnStartedAt ?? 0}`)

  useEffect(() => {
    const epoch = `${turnKey}:${turnStartedAt ?? 0}`
    if (turnEpochRef.current !== epoch) {
      turnEpochRef.current = epoch
      sawRunningRef.current = false
      expiredKeyRef.current = null
    }
  }, [turnKey, turnStartedAt])

  useEffect(() => {
    if (finished || !turnSeconds || turnSeconds <= 0 || !turnStartedAt) {
      setRemainingMs(null)
      return
    }

    let fallbackId: number | undefined

    const fireExpire = () => {
      if (expiredKeyRef.current === turnKey) return
      expiredKeyRef.current = turnKey
      onExpireRef.current()
    }

    const tick = () => {
      const left = turnStartedAt + turnSeconds * 1000 - Date.now()
      setRemainingMs(Math.max(0, left))
      if (left > 300) sawRunningRef.current = true
      if (left > 0 || !sawRunningRef.current) return

      if (canExpire) {
        fireExpire()
        return
      }

      if (fallbackId === undefined) {
        fallbackId = window.setTimeout(fireExpire, fallbackExpireMs)
      }
    }

    tick()
    const id = window.setInterval(tick, 200)
    return () => {
      window.clearInterval(id)
      if (fallbackId !== undefined) window.clearTimeout(fallbackId)
    }
  }, [turnSeconds, turnStartedAt, turnKey, finished, canExpire, fallbackExpireMs])

  const remainingSec =
    remainingMs === null ? null : Math.max(0, Math.ceil(remainingMs / 1000))

  const expired = remainingMs !== null && remainingMs <= 0

  return {
    enabled: Boolean(turnSeconds && turnSeconds > 0 && turnStartedAt && !finished),
    remainingMs,
    remainingSec,
    /** Large on-board overlay count (5…1) during the last seconds of your turn. */
    countdownSec:
      canExpire && remainingSec !== null && remainingSec > 0 && remainingSec <= 5
        ? remainingSec
        : null,
    /** Opponent's turn hit 0 — waiting for server sync (don't flash urgent red). */
    waitingSync: expired && !canExpire,
    urgency: canExpire && remainingSec !== null && remainingSec > 0 && remainingSec <= 5,
  }
}
