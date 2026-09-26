import { lazy, Suspense, useEffect, useState } from 'react'
import {
  DesktopNavigation,
  MobileNavigation,
  type AppPage,
} from './components/layout/Navigation'
import { TodayPage } from './pages/TodayPage'
import { PwaUpdatePrompt } from './pwa/PwaUpdatePrompt'
import { appPageFromLocation, pushAppPage } from './routing/appRoutes'

const ExpensesPage = lazy(() => import('./pages/ExpensesPage').then((module) => ({ default: module.ExpensesPage })))
const ExercisePage = lazy(() => import('./pages/ExercisePage').then((module) => ({ default: module.ExercisePage })))
const RecordsPage = lazy(() => import('./pages/RecordsPage').then((module) => ({ default: module.RecordsPage })))
const WeeklyReviewPage = lazy(() => import('./pages/WeeklyReviewPage').then((module) => ({ default: module.WeeklyReviewPage })))
const AnimePage = lazy(() => import('./pages/AnimePage').then((module) => ({ default: module.AnimePage })))
const CommandPalette = lazy(() => import('./components/command/CommandPalette').then((module) => ({ default: module.CommandPalette })))

function App() {
  const [activePage, setActivePage] = useState<AppPage>(() => appPageFromLocation())
  const [commandOpen, setCommandOpen] = useState(false)

  useEffect(() => {
    function syncPageFromUrl() { setActivePage(appPageFromLocation()) }
    window.addEventListener('popstate', syncPageFromUrl)
    window.addEventListener('hashchange', syncPageFromUrl)
    return () => {
      window.removeEventListener('popstate', syncPageFromUrl)
      window.removeEventListener('hashchange', syncPageFromUrl)
    }
  }, [])

  useEffect(() => {
    function openCommand(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', openCommand)
    return () => window.removeEventListener('keydown', openCommand)
  }, [])

  function navigate(page: AppPage) {
    if (page !== activePage || window.location.hash) pushAppPage(page)
    setActivePage(page)
  }

  function searchAnime(query: string) {
    window.history.pushState(null, '', `/anime?q=${encodeURIComponent(query)}`)
    setActivePage('anime')
  }

  return (
    <div className="min-h-[100dvh] text-[var(--text-primary)]">
      <DesktopNavigation activePage={activePage} onNavigate={navigate} />

      <main className="min-w-0 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(3.25rem+env(safe-area-inset-top))] lg:ml-28 lg:pb-8 lg:pt-0">
        <Suspense fallback={<div className="mx-auto max-w-[92rem] px-4 py-8 text-sm text-[var(--text-muted)]">Opening…</div>}>
          {activePage === 'today' ? (
            <TodayPage onNavigate={navigate} onOpenCommand={() => setCommandOpen(true)} />
          ) : activePage === 'expenses' ? (
            <ExpensesPage onOpenRecords={() => navigate('records')} />
          ) : activePage === 'exercise' ? (
            <ExercisePage onOpenRecords={() => navigate('records')} />
          ) : activePage === 'records' ? (
            <RecordsPage />
          ) : activePage === 'anime' ? (
            <AnimePage />
          ) : (
            <WeeklyReviewPage />
          )}
        </Suspense>
      </main>

      <MobileNavigation activePage={activePage} onNavigate={navigate} />
      <PwaUpdatePrompt />
      {commandOpen && <Suspense fallback={null}><CommandPalette open onClose={() => setCommandOpen(false)} onNavigate={navigate} onAnimeSearch={searchAnime} /></Suspense>}
    </div>
  )
}

export default App
