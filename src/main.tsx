import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyDarkModeClass, isDarkMode } from './preferences/gamePreferences'
import { installAudioUnlockListeners } from './audio/context'
import './index.css'
import App from './App.tsx'

applyDarkModeClass(isDarkMode())
installAudioUnlockListeners()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
