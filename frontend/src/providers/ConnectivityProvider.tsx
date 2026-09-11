import { useEffect, useState, type ReactNode } from 'react'
import {
  ConnectivityContext,
  type ConnectivityStatus,
} from './connectivityContextDefinition'

function currentConnectivity(): ConnectivityStatus {
  return navigator.onLine ? 'online' : 'offline'
}

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectivityStatus>(currentConnectivity)

  useEffect(() => {
    function handleOnline() {
      setStatus('online')
    }

    function handleOffline() {
      setStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return <ConnectivityContext.Provider value={status}>{children}</ConnectivityContext.Provider>
}
