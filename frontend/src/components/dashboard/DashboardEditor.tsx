import { ChevronDown, ChevronUp, Eye, EyeOff, RotateCcw, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { type DashboardSection } from '../../domain/dashboardPreferences'
import { useDashboardPreferences } from '../../state/useDashboardPreferences'
import { Button } from '../ui/button'

const labels: Record<DashboardSection, string> = { finance: 'Finance', exercise: 'Exercise', anime: 'Anime', review: 'Weekly Review', records: 'Records', calendar: 'Calendar' }

export function DashboardEditor({ dashboard }: { dashboard: ReturnType<typeof useDashboardPreferences> }) {
  const [editing, setEditing] = useState(false)
  const { preferences, move, setVisible, reset } = dashboard
  if (!editing) return <div className="mt-4 flex justify-end"><Button type="button" variant="ghost" onClick={() => setEditing(true)}><Settings2 size={16} />Edit Dashboard</Button></div>
  return <section aria-label="Edit Dashboard" className="dashboard-card mt-4 p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><p className="section-label">Dashboard layout</p><h2 className="mt-1 text-lg font-semibold">Edit Dashboard</h2></div><Button type="button" onClick={() => setEditing(false)}>Done</Button></div><p className="mt-2 text-sm text-[var(--text-secondary)]">Changes stay on this device for this account.</p>
    <ol className="mt-4 space-y-2">{preferences.order.map((section, index) => { const visible = !preferences.hidden.includes(section); return <li key={section} className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-2"><span className="min-w-0 flex-1 px-2 text-sm font-semibold">{labels[section]}</span><button type="button" aria-label={`Move ${labels[section]} up`} disabled={index === 0} onClick={() => move(section, -1)} className="grid size-11 place-items-center rounded-xl disabled:opacity-30"><ChevronUp size={17} /></button><button type="button" aria-label={`Move ${labels[section]} down`} disabled={index === preferences.order.length - 1} onClick={() => move(section, 1)} className="grid size-11 place-items-center rounded-xl disabled:opacity-30"><ChevronDown size={17} /></button><button type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${labels[section]}`} onClick={() => setVisible(section, !visible)} className="grid size-11 place-items-center rounded-xl text-[var(--text-secondary)]">{visible ? <Eye size={17} /> : <EyeOff size={17} />}</button></li> })}</ol>
    <Button type="button" variant="ghost" className="mt-3" onClick={reset}><RotateCcw size={16} />Reset to default</Button>
  </section>
}
