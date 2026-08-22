import { useEffect } from 'react'
import { requestAmbientBgm } from '../audio/bgm'

/** Calm ambient BGM for menu, lobby, and pre-game screens. */
export function useAmbientMusic(active: boolean) {
  useEffect(() => {
    requestAmbientBgm(active)
    return () => requestAmbientBgm(false)
  }, [active])
}
