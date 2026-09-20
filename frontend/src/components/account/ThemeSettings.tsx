import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '../../theme/useTheme'
import type { ThemePreference } from '../../theme/theme'

const choices: Array<{ value: ThemePreference; label: string; icon: typeof Monitor }> = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

export function ThemeSettings() {
  const theme = useTheme()
  return <section className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 sm:p-5" aria-labelledby="theme-heading">
    <h3 id="theme-heading" className="section-label">Theme</h3>
    <div className="mt-3 grid grid-cols-3 gap-2">
      {choices.map(({ value, label, icon: Icon }) => <button key={value} type="button" aria-pressed={theme.preference === value} onClick={() => theme.setPreference(value)} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)] ${theme.preference === value ? 'border-[var(--accent-primary)] bg-[var(--accent-wash)] text-[var(--accent-soft)]' : 'border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}><Icon aria-hidden="true" size={16} />{label}</button>)}
    </div>
  </section>
}
