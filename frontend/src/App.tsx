import { lazy, Suspense, useState } from 'react'
import {
  DesktopNavigation,
  MobileNavigation,
  type AppPage,
} from './components/layout/Navigation'
import { RecordsPage } from './pages/RecordsPage'
import { TodayPage } from './pages/TodayPage'
import { WeeklyReviewPage } from './pages/WeeklyReviewPage'
import { PwaUpdatePrompt } from './pwa/PwaUpdatePrompt'

const AnimePage = lazy(() => import('./pages/AnimePage').then((module) => ({ default: module.AnimePage })))

function App() {
  const [activePage, setActivePage] = useState<AppPage>('today')

  return (
    <div className="min-h-[100dvh] text-[var(--text-primary)]">
      <DesktopNavigation activePage={activePage} onNavigate={setActivePage} />

      <main className="min-w-0 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:ml-28 lg:pb-8">
        {activePage === 'today' ? (
          <TodayPage />
        ) : activePage === 'records' ? (
          <RecordsPage />
        ) : activePage === 'anime' ? (
          <Suspense fallback={<div className="mx-auto max-w-[92rem] px-4 py-8 text-sm text-[var(--text-muted)]">Opening Anime…</div>}>
            <AnimePage />
          </Suspense>
        ) : (
          <WeeklyReviewPage />
        )}
      </main>

      <MobileNavigation activePage={activePage} onNavigate={setActivePage} />
      <PwaUpdatePrompt />
    </div>
  )
}

export default App
