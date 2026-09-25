import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { expenseCategoryOptions } from '../../domain/expense'
import { suggestFinanceRules } from '../../domain/financeRules'
import { incomeCategoryOptions } from '../../domain/income'
import { useFinanceRules } from '../../state/useFinanceRules'
import { useRecords } from '../../state/useRecords'
import type { FinanceRuleCategory, FinanceRuleDirection, FinanceRuleMatchType } from '../../types/finance'
import { Button } from '../ui/button'

export function FinanceRulesPanel() {
  const { expenses, incomes } = useRecords()
  const { rules, status, createRule, setRuleEnabled, deleteRule } = useFinanceRules()
  const [adding, setAdding] = useState(false)
  const [direction, setDirection] = useState<FinanceRuleDirection>('expense')
  const [matchType, setMatchType] = useState<FinanceRuleMatchType>('exact')
  const [pattern, setPattern] = useState('')
  const [category, setCategory] = useState<FinanceRuleCategory>('food')
  const [error, setError] = useState('')
  const suggestions = useMemo(() => suggestFinanceRules(expenses, incomes, rules), [expenses, incomes, rules])
  const options = direction === 'expense' ? expenseCategoryOptions : incomeCategoryOptions

  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (!pattern.trim()) { setError('Enter a merchant or text pattern.'); return }
    try { await createRule({ direction, matchType, pattern, category, enabled: true }); setPattern(''); setAdding(false) }
    catch { setError('The rule could not be saved.') }
  }

  return <section className="dashboard-card mt-4 p-5 sm:p-6" aria-labelledby="finance-rules-heading">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="section-label">Organization</p><h2 id="finance-rules-heading" className="mt-1 text-lg font-semibold">Merchant & category rules</h2></div><Button variant="secondary" onClick={() => setAdding((value) => !value)}><Plus size={16} />Add rule</Button></div>
    <p className="mt-2 text-sm text-[var(--text-secondary)]">Rules suggest categories for new candidates. They never rewrite historical transactions.</p>
    {suggestions.length > 0 && <div className="mt-4 space-y-2"><p className="section-label">Suggested from repeated choices</p>{suggestions.slice(0, 3).map((suggestion) => <div key={`${suggestion.direction}-${suggestion.pattern}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3"><p className="min-w-0 flex-1 text-sm"><strong>{suggestion.displayPattern}</strong> <span className="text-[var(--text-muted)]">→ {suggestion.category} · {suggestion.sampleCount} matches</span></p><Button variant="secondary" onClick={() => void createRule(suggestion)}>Create rule</Button></div>)}</div>}
    {adding && <form className="mt-4 grid gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4 sm:grid-cols-2" onSubmit={submit}>
      <label className="form-label">Direction<select className="form-control mt-1" value={direction} onChange={(event) => { const value = event.target.value as FinanceRuleDirection; setDirection(value); setCategory(value === 'expense' ? 'food' : 'salary') }}><option value="expense">Expense</option><option value="income">Income</option></select></label>
      <label className="form-label">Match<select className="form-control mt-1" value={matchType} onChange={(event) => setMatchType(event.target.value as FinanceRuleMatchType)}><option value="exact">Exact normalized text</option><option value="contains">Contains text</option></select></label>
      <label className="form-label">Merchant or text<input className="form-control mt-1" value={pattern} onChange={(event) => setPattern(event.target.value)} maxLength={120} /></label>
      <label className="form-label">Category<select className="form-control mt-1" value={category} onChange={(event) => setCategory(event.target.value as FinanceRuleCategory)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      {error && <p role="alert" className="form-error sm:col-span-2">{error}</p>}<div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button type="submit">Review & create</Button></div>
    </form>}
    <div className="mt-4 space-y-2">{status === 'loading' ? <p className="text-sm text-[var(--text-muted)]">Loading rules...</p> : rules.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-sm text-[var(--text-muted)]">No saved rules. EdenOS may suggest one after repeated consistent categorization.</p> : rules.map((rule) => <div key={rule.id} className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] p-3"><button type="button" role="switch" aria-checked={rule.enabled} onClick={() => void setRuleEnabled(rule.id, !rule.enabled)} className={`relative h-7 w-12 rounded-full ${rule.enabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--surface-hover)]'}`}><span className={`absolute top-1 size-5 rounded-full bg-white transition-transform ${rule.enabled ? 'left-6' : 'left-1'}`} /></button><p className="min-w-0 flex-1 text-sm"><strong>{rule.matchType === 'contains' ? 'Contains' : 'Exact'} “{rule.pattern}”</strong><span className="block text-xs text-[var(--text-muted)]">{rule.direction} → {rule.category}</span></p><button type="button" aria-label={`Delete rule ${rule.pattern}`} onClick={() => void deleteRule(rule.id)} className="grid size-10 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--danger-wash)] hover:text-[var(--danger)]"><Trash2 size={16} /></button></div>)}</div>
  </section>
}
