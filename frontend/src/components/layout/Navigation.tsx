import { CalendarDays, ClipboardCheck, Layers3, Plus, UserRound } from 'lucide-react'
import { AccountDialog } from '../account/AccountDialog'
import { CaptureSheet } from '../capture/CaptureSheet'
import { triggerPressFeedback } from '../ui/pressFeedback'

export type AppPage = 'today' | 'records' | 'review'

const navItems: Array<{
  label: string
  icon: typeof CalendarDays
  page: AppPage | null
}> = [
  { label: 'Today', icon: CalendarDays, page: 'today' },
  { label: 'Records', icon: Layers3, page: 'records' },
  { label: 'Review', icon: ClipboardCheck, page: 'review' },
]

export function DesktopNavigation({
  activePage,
  onNavigate,
}: {
  activePage: AppPage
  onNavigate: (page: AppPage) => void
}) {
  return (
    <aside
      aria-label="Eden OS controls"
      className="fixed bottom-5 left-5 top-5 z-40 hidden w-20 flex-col items-center rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-4 shadow-[var(--shadow-soft)] lg:flex"
    >
      <div
        aria-label="Eden OS"
        className="grid size-11 place-items-center rounded-2xl bg-[var(--accent-primary)] text-sm font-bold tracking-[-0.02em] text-white shadow-[var(--accent-shadow)]"
      >
        E
      </div>

      <nav aria-label="Primary navigation" className="absolute top-1/2 flex -translate-y-1/2 flex-col gap-2">
        {navItems.map(({ label, icon: Icon, page }) => {
          const active = page === activePage
          return (
            <div key={label} className="group relative">
              <button
                type="button"
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                aria-disabled={!page}
                disabled={!page}
                onClick={() => page && onNavigate(page)}
                className={`grid size-12 place-items-center rounded-2xl outline-none transition-colors focus-visible:ring-3 focus-visible:ring-[var(--focus)] ${
                  active
                    ? 'bg-[var(--accent-wash)] text-[var(--accent-soft)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <Icon aria-hidden="true" size={20} strokeWidth={active ? 2.1 : 1.7} />
              </button>
              <span className="pointer-events-none absolute left-[calc(100%+0.65rem)] top-1/2 z-50 -translate-y-1/2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                {label}
              </span>
            </div>
          )
        })}
      </nav>

      <AccountDialog>
        <button
          type="button"
          aria-label="Account"
          className="mt-auto grid size-11 place-items-center rounded-2xl text-[var(--text-muted)] outline-none transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]"
        >
          <UserRound aria-hidden="true" size={20} strokeWidth={1.7} />
        </button>
      </AccountDialog>
    </aside>
  )
}

export function MobileNavigation({
  activePage,
  onNavigate,
}: {
  activePage: AppPage
  onNavigate: (page: AppPage) => void
}) {
  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-2 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 rounded-[1.4rem] border border-[var(--border-subtle)] bg-[var(--mobile-nav)] px-1 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:inset-x-3 sm:px-2 lg:hidden"
    >
      <div className="mx-auto grid h-17 max-w-md grid-cols-5 items-center">
        <MobileNavItem
          label="Today"
          icon={CalendarDays}
          active={activePage === 'today'}
          onClick={() => onNavigate('today')}
        />
        <MobileNavItem
          label="Records"
          icon={Layers3}
          active={activePage === 'records'}
          onClick={() => onNavigate('records')}
        />
        <CaptureSheet>
          <button
            {...triggerPressFeedback}
            type="button"
            aria-label="Capture something"
            className="press-feedback mx-auto flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold text-[var(--accent-soft)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)]"
          >
            <span className="grid size-10 place-items-center rounded-2xl bg-[var(--accent-primary)] text-white shadow-[var(--accent-shadow)]">
              <Plus aria-hidden="true" size={21} strokeWidth={2.2} />
            </span>
            <span>Capture</span>
          </button>
        </CaptureSheet>
        <MobileNavItem
          label="Review"
          icon={ClipboardCheck}
          active={activePage === 'review'}
          onClick={() => onNavigate('review')}
        />
        <AccountDialog>
          <button
            type="button"
            aria-label="Account"
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium text-[var(--text-muted)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)]"
          >
            <UserRound aria-hidden="true" size={19} strokeWidth={1.7} />
            Account
          </button>
        </AccountDialog>
      </div>
    </nav>
  )
}

function MobileNavItem({
  label,
  icon: Icon,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string
  icon: typeof CalendarDays
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-current={active ? 'page' : undefined}
      aria-disabled={disabled}
      onClick={onClick}
      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)] ${
        active ? 'text-[var(--accent-soft)]' : 'text-[var(--text-muted)] disabled:opacity-65'
      }`}
    >
      <Icon aria-hidden="true" size={19} strokeWidth={active ? 2.2 : 1.7} />
      {label}
    </button>
  )
}
