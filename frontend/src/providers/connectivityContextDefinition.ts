import { createContext } from 'react'

export type ConnectivityStatus = 'online' | 'offline'

export const ConnectivityContext = createContext<ConnectivityStatus | null>(null)
