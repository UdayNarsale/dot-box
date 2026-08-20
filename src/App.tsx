import { useState } from 'react'
import { isFirebaseConfigured } from './firebase/config'
import { LocalGame } from './components/LocalGame'
import { Menu } from './components/Menu'
import { OnlineFlow } from './components/OnlineFlow'
import type { AppMode } from './types/game'

export default function App() {
  const [mode, setMode] = useState<AppMode>('menu')
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

  return (
    <Menu
      firebaseReady={firebaseReady}
      onLocal={() => setMode('local')}
      onCreate={() => setMode('online-create')}
      onJoin={() => setMode('online-join')}
    />
  )
}
