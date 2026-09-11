import { useState } from 'react'
import {
  DesktopNavigation,
  MobileNavigation,
  type AppPage,
} from './components/layout/Navigation'
import { RecordsPage } from './pages/RecordsPage'
import { TodayPage } from './pages/TodayPage'
import { PwaUpdatePrompt } from './pwa/PwaUpdatePrompt'

function App() {
  const [activePage, setActivePage] = useState<AppPage>('today')

  return (
    <div className="min-h-[100dvh] text-[var(--text-primary)]">
      <DesktopNavigation activePage={activePage} onNavigate={setActivePage} />

      <main className="min-w-0 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:ml-28 lg:pb-8">
        {activePage === 'today' ? <TodayPage /> : <RecordsPage />}
      </main>

      <MobileNavigation activePage={activePage} onNavigate={setActivePage} />
      <PwaUpdatePrompt />
    </div>
  )
}

export default App
