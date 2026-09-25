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
import { FinancePlanningProvider } from './state/FinancePlanningProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
    <ConnectivityProvider>
      <PwaProvider>
        <OfflineIndicator />
        <FirebaseAuthProvider>
          <RecordsProvider>
            <UserSettingsProvider>
              <FinancePlanningProvider>
              <FinanceRulesProvider>
              <AnimeProgressProvider>
                <PrivacyLockProvider>
                  <App />
                </PrivacyLockProvider>
              </AnimeProgressProvider>
              </FinanceRulesProvider>
              </FinancePlanningProvider>
            </UserSettingsProvider>
          </RecordsProvider>
        </FirebaseAuthProvider>
      </PwaProvider>
    </ConnectivityProvider>
    </ThemeProvider>
  </StrictMode>,
)
