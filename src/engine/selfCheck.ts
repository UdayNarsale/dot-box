import { createGame, hEdge, placeLine, vEdge, winners } from './gameEngine'

/** Lightweight self-check used in build verification */
export function runEngineSelfCheck(): string[] {
  const errors: string[] = []
  let g = createGame(5, 3)

  // Close one box with chain of 3 sides then 4th
  const steps = [hEdge(0, 0), hEdge(1, 0), vEdge(0, 0)]
  for (const e of steps) {
    const r = placeLine(g, e)
    if (!r) errors.push(`failed placing ${e}`)
    else g = r.state
  }
  const close = placeLine(g, vEdge(0, 1))
  if (!close || close.closedBoxes.length !== 1) errors.push('expected one closed box')
  else {
    g = close.state
    if (g.turnIndex !== 0) errors.push('expected bonus turn for player 0')
    if (g.scores[0] !== 1) errors.push('expected score 1')
  }

  // Reject overwrite
  if (placeLine(g, hEdge(0, 0)) !== null) errors.push('overwrite should fail')

  // Two-box chain on shared edge later — fill adjacent box sides
  // Keep simple: finish game detection on tiny path not required here
  if (winners({ ...g, finished: true, scores: [2, 2, 1] }).length !== 2) {
    errors.push('tie winners failed')
  }

  return errors
}
