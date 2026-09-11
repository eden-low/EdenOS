import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { OfflineIndicator } from './components/layout/OfflineIndicator'
import { ConnectivityProvider } from './providers/ConnectivityProvider'
import { PwaProvider } from './pwa/PwaProvider'
import { FirebaseAuthProvider } from './state/FirebaseAuthProvider'
import { RecordsProvider } from './state/RecordsContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConnectivityProvider>
      <PwaProvider>
        <OfflineIndicator />
        <FirebaseAuthProvider>
          <RecordsProvider>
            <App />
          </RecordsProvider>
        </FirebaseAuthProvider>
      </PwaProvider>
    </ConnectivityProvider>
  </StrictMode>,
)
