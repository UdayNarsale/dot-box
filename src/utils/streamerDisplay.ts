/** Mask names and labels when streaming. */
export function streamerPlayerLabel(
  streamerMode: boolean,
  name: string,
  seatIndex: number,
  isYou?: boolean,
): string {
  if (!streamerMode) {
    return isYou ? `${name} (you)` : name
  }
  return `Player ${seatIndex + 1}`
}

export function streamerSubtitle(
  streamerMode: boolean,
  parts: { lobbyCode?: string; dots: number; turnSecs?: number; myTurn?: boolean },
): string {
  const grid = `${parts.dots}×${parts.dots}`
  const timer = parts.turnSecs ? ` · ${parts.turnSecs}s / turn` : ''
  const turn = parts.myTurn ? ' · Your turn' : ''
  if (streamerMode) {
    return `${grid}${timer}${turn}`
  }
  const lobby = parts.lobbyCode ? `Lobby ${parts.lobbyCode} · ` : ''
  return `${lobby}${grid}${timer}${turn}`
}
