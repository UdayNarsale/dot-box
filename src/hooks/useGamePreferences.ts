import { useEffect, useState } from 'react'
import {
  isDarkMode,
  isMusicEnabled,
  isStreamerMode,
  getMusicVolume,
  setDarkMode,
  setMusicEnabled,
  setMusicVolume,
  setStreamerMode,
  subscribeGamePreferences,
} from '../preferences/gamePreferences'

export function useGamePreferences() {
  const [, tick] = useState(0)

  useEffect(() => subscribeGamePreferences(() => tick((n) => n + 1)), [])

  return {
    musicEnabled: isMusicEnabled(),
    musicVolume: getMusicVolume(),
    streamerMode: isStreamerMode(),
    darkMode: isDarkMode(),
    setMusicEnabled,
    setMusicVolume,
    setStreamerMode,
    setDarkMode,
  }
}
