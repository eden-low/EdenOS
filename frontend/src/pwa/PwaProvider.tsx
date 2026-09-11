import { useMemo, useState, type ReactNode } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { PwaContext, type PwaUpdateState } from './pwaContextDefinition'

export function PwaProvider({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState(false)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true })

  const value = useMemo<PwaUpdateState>(
    () => ({
      updateAvailable: needRefresh && !dismissed,
      applyUpdate: () => updateServiceWorker(true),
      dismissUpdate: () => setDismissed(true),
    }),
    [dismissed, needRefresh, updateServiceWorker],
  )

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>
}
