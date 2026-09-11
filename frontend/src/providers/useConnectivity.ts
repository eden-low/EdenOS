import { useContext } from 'react'
import {
  ConnectivityContext,
  type ConnectivityStatus,
} from './connectivityContextDefinition'

export function useConnectivity(): ConnectivityStatus {
  const status = useContext(ConnectivityContext)
  if (!status) throw new Error('useConnectivity must be used within ConnectivityProvider')
  return status
}
