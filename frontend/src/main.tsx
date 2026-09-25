import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { OfflineIndicator } from './components/layout/OfflineIndicator'
import { ConnectivityProvider } from './providers/ConnectivityProvider'
import { PwaProvider } from './pwa/PwaProvider'
import { FirebaseAuthProvider } from './state/FirebaseAuthProvider'
import { RecordsProvider } from './state/RecordsContext'
import { UserSettingsProvider } from './state/UserSettingsProvider'
import { AnimeProgressProvider } from './state/AnimeProgressProvider'
import { ThemeProvider } from './theme/ThemeProvider'
import { PrivacyLockProvider } from './privacy/PrivacyLockProvider'
import { FinanceRulesProvider } from './state/FinanceRulesProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
    <ConnectivityProvider>
      <PwaProvider>
        <OfflineIndicator />
        <FirebaseAuthProvider>
          <RecordsProvider>
            <UserSettingsProvider>
              <FinanceRulesProvider>
              <AnimeProgressProvider>
                <PrivacyLockProvider>
                  <App />
                </PrivacyLockProvider>
              </AnimeProgressProvider>
              </FinanceRulesProvider>
            </UserSettingsProvider>
          </RecordsProvider>
        </FirebaseAuthProvider>
      </PwaProvider>
    </ConnectivityProvider>
    </ThemeProvider>
  </StrictMode>,
)
