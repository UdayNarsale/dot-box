import { useEffect, useState } from 'react'
import {
  isDarkMode,
  isMusicEnabled,
  isStreamerMode,
  setDarkMode,
  setMusicEnabled,
  setStreamerMode,
  subscribeGamePreferences,
} from '../preferences/gamePreferences'

export function useGamePreferences() {
  const [, tick] = useState(0)

  useEffect(() => subscribeGamePreferences(() => tick((n) => n + 1)), [])

  return {
    musicEnabled: isMusicEnabled(),
    streamerMode: isStreamerMode(),
    darkMode: isDarkMode(),
    setMusicEnabled,
    setStreamerMode,
    setDarkMode,
  }
}
