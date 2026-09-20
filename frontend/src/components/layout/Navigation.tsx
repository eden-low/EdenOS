import { CalendarDays, ClipboardCheck, Dumbbell, Layers3, Menu, Plus, ReceiptText, Tv, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AccountDialog } from '../account/AccountDialog'
import { CaptureSheet } from '../capture/CaptureSheet'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '../ui/dialog'
import { triggerPressFeedback } from '../ui/pressFeedback'
import { usePrivacyLock } from '../../privacy/usePrivacyLock'

export type AppPage = 'today' | 'expenses' | 'exercise' | 'records' | 'review' | 'anime'

const navItems: Array<{ label: string; icon: typeof CalendarDays; page: AppPage }> = [
  { label: 'Today', icon: CalendarDays, page: 'today' },
  { label: 'Expenses', icon: ReceiptText, page: 'expenses' },
  { label: 'Exercise', icon: Dumbbell, page: 'exercise' },
  { label: 'Records', icon: Layers3, page: 'records' },
  { label: 'Review', icon: ClipboardCheck, page: 'review' },
  { label: 'Anime', icon: Tv, page: 'anime' },
]

export function DesktopNavigation({ activePage, onNavigate }: { activePage: AppPage; onNavigate: (page: AppPage) => void }) {
  return <aside aria-label="Eden OS controls" className="fixed bottom-5 left-5 top-5 z-40 hidden w-20 flex-col items-center rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-4 shadow-[var(--shadow-soft)] lg:flex">
    <div aria-label="Eden OS" className="grid size-11 place-items-center rounded-2xl bg-[var(--accent-primary)] text-sm font-bold text-white shadow-[var(--accent-shadow)]">E</div>
    <nav aria-label="Primary navigation" className="absolute top-1/2 flex -translate-y-1/2 flex-col gap-1">
      {navItems.map(({ label, icon: Icon, page }) => { const active = page === activePage; return <div key={page} className="group relative"><button type="button" aria-label={label} aria-current={active ? 'page' : undefined} onClick={() => onNavigate(page)} className={`grid size-11 place-items-center rounded-2xl outline-none transition-colors focus-visible:ring-3 focus-visible:ring-[var(--focus)] ${active ? 'bg-[var(--accent-wash)] text-[var(--accent-soft)]' : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]'}`}><Icon aria-hidden="true" size={19} strokeWidth={active ? 2.1 : 1.7} /></button><span className="pointer-events-none absolute left-[calc(100%+0.65rem)] top-1/2 z-50 -translate-y-1/2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">{label}</span></div> })}
    </nav>
    <AccountDialog><button type="button" aria-label="Account" className="mt-auto grid size-11 place-items-center rounded-2xl text-[var(--text-muted)] outline-none hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]"><UserRound aria-hidden="true" size={20} /></button></AccountDialog>
  </aside>
}

export function MobileNavigation({ activePage, onNavigate }: { activePage: AppPage; onNavigate: (page: AppPage) => void }) {
  const [open, setOpen] = useState(false)
  const privacy = usePrivacyLock()
  const touch = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    function start(event: TouchEvent) { const point = event.touches[0]; touch.current = point && point.clientX <= 28 ? { x: point.clientX, y: point.clientY } : null }
    function end(event: TouchEvent) { const origin = touch.current; touch.current = null; const point = event.changedTouches[0]; if (!origin || !point) return; const dx = point.clientX - origin.x; const dy = Math.abs(point.clientY - origin.y); if (dx >= 60 && dx > dy * 1.35) setOpen(true) }
    window.addEventListener('touchstart', start, { passive: true }); window.addEventListener('touchend', end, { passive: true })
    return () => { window.removeEventListener('touchstart', start); window.removeEventListener('touchend', end) }
  }, [])
  function navigate(page: AppPage) { onNavigate(page); setOpen(false) }
  return <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><button type="button" aria-label="Open apps" className="fixed left-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-40 grid size-11 place-items-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--mobile-nav)] text-[var(--text-secondary)] shadow-[var(--shadow-soft)] backdrop-blur-xl outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)] lg:hidden"><Menu aria-hidden="true" size={20} /></button></DialogTrigger>
      <DialogContent variant="drawer" className="flex flex-col" aria-describedby="app-drawer-description">
        <DialogTitle className="pr-12 text-lg font-semibold">Apps</DialogTitle><DialogDescription id="app-drawer-description" className="mt-1 text-sm text-[var(--text-muted)]">Move through EdenOS.</DialogDescription>
        <nav aria-label="App drawer" className="mt-6 space-y-1">{navItems.map(({ label, page, icon: Icon }) => <button key={page} type="button" aria-current={activePage === page ? 'page' : undefined} onClick={() => navigate(page)} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)] ${activePage === page ? 'bg-[var(--accent-wash)] text-[var(--accent-soft)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}><Icon aria-hidden="true" size={19} /><span>{label}</span></button>)}<AccountDialog><button type="button" className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-[var(--text-secondary)] outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]"><UserRound aria-hidden="true" size={19} /><span>Account</span></button></AccountDialog></nav>
        {privacy.enabled && <button type="button" onClick={() => { if (privacy.locked) privacy.requestUnlock(); else privacy.lock(); setOpen(false) }} className="mt-auto min-h-11 rounded-xl border border-[var(--border-subtle)] px-3 text-left text-sm font-semibold text-[var(--text-secondary)] outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]">{privacy.locked ? 'Unlock financial values' : 'Lock financial values'}</button>}
      </DialogContent>
    </Dialog>
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(0.8rem+env(safe-area-inset-bottom))] z-40 flex justify-center lg:hidden"><CaptureSheet><button {...triggerPressFeedback} type="button" aria-label="Capture something" className="press-feedback pointer-events-auto grid size-16 place-items-center rounded-[1.35rem] border border-white/10 bg-[var(--accent-primary)] text-white shadow-[var(--accent-shadow)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)]"><Plus aria-hidden="true" size={27} strokeWidth={2.2} /></button></CaptureSheet></div>
  </>
}
