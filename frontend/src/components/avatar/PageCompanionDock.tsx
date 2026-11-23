import type { AppPage } from '../layout/Navigation'
import './pageCompanion.css'

export type CompanionPage = Extract<AppPage, 'expenses' | 'exercise' | 'review' | 'cosmos'>

// Reserve content-free space in each page introduction, never over a card or form.
export function PageCompanionDock({ page }: { page: CompanionPage }) {
  return <div className={`page-companion-landing page-companion-${page}`} aria-hidden="true">
    <div className="page-companion-dock" data-page-avatar-dock={page} />
    <span className="page-companion-contact" />
  </div>
}
