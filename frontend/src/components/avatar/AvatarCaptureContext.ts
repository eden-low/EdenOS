import { createContext, useContext, useLayoutEffect } from 'react'

export interface CaptureAnchor { owner: symbol; sheet: HTMLDivElement; suspended: boolean }
export const AvatarCaptureContext = createContext<((anchor: CaptureAnchor | null, owner: symbol) => void) | null>(null)

// Every CaptureSheet (including the mobile + and Dashboard entry) shares this bridge.
// Optional context keeps other pages and standalone Capture tests independent.
export function useAvatarCapture(anchor: CaptureAnchor | null, owner: symbol) {
  const publish = useContext(AvatarCaptureContext)
  useLayoutEffect(() => {
    if (!anchor) return
    publish?.(anchor, owner)
    return () => publish?.(null, owner)
  }, [publish, anchor, owner])
}
