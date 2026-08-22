import { useState } from 'react'
import { loadSession } from './firebase/session'
import { isFirebaseConfigured } from './firebase/config'
import { LocalGame } from './components/LocalGame'
import { HomeSettings } from './components/HomeSettings'
import { Menu } from './components/Menu'
import { OnlineFlow } from './components/OnlineFlow'
import { useThemeEffect } from './hooks/useThemeEffect'
import type { AppMode } from './types/game'

export default function App() {
  useThemeEffect()
  const [mode, setMode] = useState<AppMode>(() => {
    const session = loadSession()
    if (!session || !isFirebaseConfigured()) return 'menu'
    return session.intent === 'create' ? 'online-create' : 'online-join'
  })
  const firebaseReady = isFirebaseConfigured()

  if (mode === 'local') {
    return <LocalGame onExit={() => setMode('menu')} />
  }
  if (mode === 'online-create') {
    return <OnlineFlow intent="create" onExit={() => setMode('menu')} />
  }
  if (mode === 'online-join') {
    return <OnlineFlow intent="join" onExit={() => setMode('menu')} />
  }

  if (mode === 'settings') {
    return <HomeSettings onBack={() => setMode('menu')} />
  }

  return (
    <Menu
      firebaseReady={firebaseReady}
      onLocal={() => setMode('local')}
      onCreate={() => setMode('online-create')}
      onJoin={() => setMode('online-join')}
      onSettings={() => setMode('settings')}
    />
  )
}
