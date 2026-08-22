/** Full-screen red pulse during the last 5 seconds of a turn — does not touch the board. */
export function TurnCountdownFlash({ countdownSec }: { countdownSec: number | null }) {
  if (countdownSec === null || countdownSec <= 0) return null

  return (
    <div
      key={countdownSec}
      className="turn-page-flash fixed inset-0 pointer-events-none z-[5]"
      aria-hidden
    />
  )
}
