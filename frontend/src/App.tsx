import { useState } from 'react'
import {
  DesktopNavigation,
  MobileNavigation,
  type AppPage,
} from './components/layout/Navigation'
import { RecordsPage } from './pages/RecordsPage'
import { TodayPage } from './pages/TodayPage'

function App() {
  const [activePage, setActivePage] = useState<AppPage>('today')

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <DesktopNavigation activePage={activePage} onNavigate={setActivePage} />

      <main className="min-w-0 pb-28 lg:ml-28 lg:pb-8">
        {activePage === 'today' ? <TodayPage /> : <RecordsPage />}
      </main>

      <MobileNavigation activePage={activePage} onNavigate={setActivePage} />
    </div>
  )
}

export default App
