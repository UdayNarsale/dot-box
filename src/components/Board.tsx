import { useMemo } from 'react'
import type { GameState } from '../types/game'
import { PLAYER_COLORS } from '../types/game'
import { hEdge, vEdge } from '../engine/gameEngine'

interface BoardProps {
  game: GameState
  interactive: boolean
  onEdgeClick: (edgeId: string) => void
  highlightPlayer?: number
  /** Seat index → palette index so assigned colors (not just seat order) paint lines/boxes. */
  playerColorIndexes?: number[]
}

function paletteColor(playerIndex: number, playerColorIndexes?: number[]) {
  const colorIndex = playerColorIndexes?.[playerIndex] ?? playerIndex
  return PLAYER_COLORS[colorIndex % PLAYER_COLORS.length]!
}

export function Board({
  game,
  interactive,
  onEdgeClick,
  highlightPlayer,
  playerColorIndexes,
}: BoardProps) {
  const { dots, lines: rawLines, boxes: rawBoxes } = game
  const lines = rawLines ?? {}
  const boxes = rawBoxes ?? {}

  const cell = dots >= 12 ? 36 : dots >= 9 ? 42 : 52
  const pad = 20
  const size = pad * 2 + (dots - 1) * cell
  const dotR = dots >= 12 ? 4.5 : 5.25
  const hit = Math.min(24, cell * 0.58)
  const drawnWidth = dots >= 12 ? 3.5 : 4.25
  const hoverWidth = dots >= 12 ? 3 : 3.75

  const current = paletteColor(highlightPlayer ?? 0, playerColorIndexes)

  const boxRects = useMemo(() => {
    const list: Array<{ key: string; x: number; y: number; owner: number }> = []
    for (let r = 0; r < dots - 1; r++) {
      for (let c = 0; c < dots - 1; c++) {
        const key = `${r}-${c}`
        const owner = boxes[key]
        if (owner === undefined) continue
        list.push({ key, x: pad + c * cell, y: pad + r * cell, owner })
      }
    }
    return list
  }, [boxes, dots, cell, pad])

  return (
    <div className="board-frame w-full max-w-[min(96vw,720px)] mx-auto select-none touch-manipulation">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width="100%"
        height="100%"
        className="board-svg"
        role="img"
        aria-label={`Dots and Boxes board ${dots} by ${dots}`}
      >
        {boxRects.map((b) => {
          const color = paletteColor(b.owner, playerColorIndexes)
          const inset = Math.max(4, cell * 0.08)
          return (
            <rect
              key={b.key}
              x={b.x + inset}
              y={b.y + inset}
              width={cell - inset * 2}
              height={cell - inset * 2}
              rx={Math.min(8, cell * 0.12)}
              fill={color.fill}
              className="board-box"
            />
          )
        })}

        {Array.from({ length: dots }, (_, r) =>
          Array.from({ length: dots - 1 }, (_, c) => {
            const id = hEdge(r, c)
            const owner = lines[id]
            const x1 = pad + c * cell
            const x2 = pad + (c + 1) * cell
            const y = pad + r * cell
            const drawn = owner !== undefined
            return (
              <g
                key={id}
                className={interactive && !drawn ? 'board-edge' : undefined}
                style={{ color: current.stroke }}
              >
                <line
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y}
                  stroke="transparent"
                  strokeWidth={hit}
                  className={interactive && !drawn ? 'board-hit' : 'pointer-events-none'}
                  onClick={() => {
                    if (interactive && !drawn) onEdgeClick(id)
                  }}
                />
                {drawn ? (
                  <line
                    x1={x1}
                    y1={y}
                    x2={x2}
                    y2={y}
                    stroke={paletteColor(owner, playerColorIndexes).stroke}
                    strokeWidth={drawnWidth}
                    strokeLinecap="round"
                    className="board-line"
                  />
                ) : (
                  interactive && (
                    <line
                      x1={x1 + cell * 0.1}
                      y1={y}
                      x2={x2 - cell * 0.1}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth={hoverWidth}
                      strokeLinecap="round"
                      className="board-hover-line"
                    />
                  )
                )}
              </g>
            )
          }),
        )}

        {Array.from({ length: dots - 1 }, (_, r) =>
          Array.from({ length: dots }, (_, c) => {
            const id = vEdge(r, c)
            const owner = lines[id]
            const y1 = pad + r * cell
            const y2 = pad + (r + 1) * cell
            const x = pad + c * cell
            const drawn = owner !== undefined
            return (
              <g
                key={id}
                className={interactive && !drawn ? 'board-edge' : undefined}
                style={{ color: current.stroke }}
              >
                <line
                  x1={x}
                  y1={y1}
                  x2={x}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth={hit}
                  className={interactive && !drawn ? 'board-hit' : 'pointer-events-none'}
                  onClick={() => {
                    if (interactive && !drawn) onEdgeClick(id)
                  }}
                />
                {drawn ? (
                  <line
                    x1={x}
                    y1={y1}
                    x2={x}
                    y2={y2}
                    stroke={paletteColor(owner, playerColorIndexes).stroke}
                    strokeWidth={drawnWidth}
                    strokeLinecap="round"
                    className="board-line"
                  />
                ) : (
                  interactive && (
                    <line
                      x1={x}
                      y1={y1 + cell * 0.1}
                      x2={x}
                      y2={y2 - cell * 0.1}
                      stroke="currentColor"
                      strokeWidth={hoverWidth}
                      strokeLinecap="round"
                      className="board-hover-line"
                    />
                  )
                )}
              </g>
            )
          }),
        )}

        {Array.from({ length: dots }, (_, r) =>
          Array.from({ length: dots }, (_, c) => (
            <circle
              key={`d-${r}-${c}`}
              cx={pad + c * cell}
              cy={pad + r * cell}
              r={dotR}
              strokeWidth={1.15}
              className="board-dot"
            />
          )),
        )}
      </svg>
    </div>
  )
}
