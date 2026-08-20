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
}

export function useTurnTimer({
  turnSeconds,
  turnStartedAt,
  turnKey,
  finished,
  onExpire,
}: UseTurnTimerOptions) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const expiredKeyRef = useRef<string | null>(null)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    if (finished || !turnSeconds || turnSeconds <= 0 || !turnStartedAt) {
      setRemainingMs(null)
      return
    }

    const tick = () => {
      const left = turnStartedAt + turnSeconds * 1000 - Date.now()
      setRemainingMs(Math.max(0, left))
      if (left <= 0 && expiredKeyRef.current !== turnKey) {
        expiredKeyRef.current = turnKey
        onExpireRef.current()
      }
    }

    tick()
    const id = window.setInterval(tick, 200)
    return () => window.clearInterval(id)
  }, [turnSeconds, turnStartedAt, turnKey, finished])

  // Allow a fresh expire when turn changes.
  useEffect(() => {
    if (expiredKeyRef.current && expiredKeyRef.current !== turnKey) {
      expiredKeyRef.current = null
    }
  }, [turnKey])

  const remainingSec =
    remainingMs === null ? null : Math.max(0, Math.ceil(remainingMs / 1000))

  return {
    enabled: Boolean(turnSeconds && turnSeconds > 0 && turnStartedAt && !finished),
    remainingMs,
    remainingSec,
    urgency: remainingSec !== null && remainingSec <= 5,
  }
}
