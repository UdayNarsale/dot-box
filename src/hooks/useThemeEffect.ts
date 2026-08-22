import { useEffect } from 'react'
import { applyDarkModeClass, isDarkMode, subscribeGamePreferences } from '../preferences/gamePreferences'

/** Keeps `html.dark` in sync with stored preference. */
export function useThemeEffect() {
  useEffect(() => {
    applyDarkModeClass(isDarkMode())
    return subscribeGamePreferences(() => applyDarkModeClass(isDarkMode()))
  }, [])
}
