import { AlertTriangle, CheckCircle2, Copy, FileInput, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import {
  candidateIssues,
  isBatchCandidateValid,
  markBatchDuplicates,
  MAX_BATCH_TRANSACTIONS,
  parseBatchTransactions,
  updateCandidateAmount,
  updateCandidateDirection,
  type BatchTransactionCandidate,
  type BatchTransactionDirection,
} from '../../domain/batchTransactions'
import { expenseCategoryOptions } from '../../domain/expense'
import { incomeCategoryOptions } from '../../domain/income'
import { FinancialAmount } from '../privacy/FinancialAmount'
import { usePrivacyLock } from '../../privacy/usePrivacyLock'
import { confirmBatchTransactions, type BatchWriteResult } from '../../services/batchTransactionImport'
import { useRecords } from '../../state/useRecords'
import type { BatchTransactionCategory } from '../../domain/batchTransactions'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog'

type Stage = 'paste' | 'review'

interface BatchSummary {
  incomeCount: number
  incomeSen: number
  expenseCount: number
  expenseSen: number
}

function summarize(candidates: BatchTransactionCandidate[]): BatchSummary {
  return candidates.reduce<BatchSummary>((summary, candidate) => {
    if (candidate.amountSen === null || candidate.direction === null) return summary
    if (candidate.direction === 'income') {
      summary.incomeCount += 1
      summary.incomeSen += candidate.amountSen
    } else {
      summary.expenseCount += 1
      summary.expenseSen += candidate.amountSen
    }
    return summary
  }, { incomeCount: 0, incomeSen: 0, expenseCount: 0, expenseSen: 0 })
}

function resultMap(results: BatchWriteResult[]): Map<string, BatchWriteResult> {
  return new Map(results.map((result) => [result.tempId, result]))
}

export function BatchImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const records = useRecords()
  const privacy = usePrivacyLock()
  const [stage, setStage] = useState<Stage>('paste')
  const [input, setInput] = useState('')
  const [candidates, setCandidates] = useState<BatchTransactionCandidate[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [results, setResults] = useState<Map<string, BatchWriteResult>>(new Map())
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const summary = useMemo(() => summarize(candidates), [candidates])
  const invalidCount = candidates.filter((candidate) => !isBatchCandidateValid(candidate)).length
  const successfulIds = useMemo(() => new Set([...results.values()].filter((result) => result.status === 'success').map((result) => result.tempId)), [results])
  const failedCount = [...results.values()].filter((result) => result.status === 'failed').length
  const complete = candidates.length > 0 && successfulIds.size === candidates.length

  function close() {
    if (submittingRef.current) return
    setStage('paste')
    setInput('')
    setCandidates([])
    setParseError(null)
    setResults(new Map())
    onClose()
  }

  function parse() {
    const parsed = parseBatchTransactions(input)
    setParseError(parsed.error)
    if (parsed.error) return
    setCandidates(parsed.candidates)
    setResults(new Map())
    setStage('review')
  }

  function updateCandidate(tempId: string, update: (candidate: BatchTransactionCandidate) => BatchTransactionCandidate) {
    setCandidates((current) => markBatchDuplicates(current.map((candidate) => candidate.tempId === tempId ? update(candidate) : candidate)))
    setResults((current) => {
      if (!current.has(tempId)) return current
      const next = new Map(current); next.delete(tempId); return next
    })
  }

  function removeCandidate(tempId: string) {
    setCandidates((current) => markBatchDuplicates(current.filter((candidate) => candidate.tempId !== tempId)))
    setResults((current) => { const next = new Map(current); next.delete(tempId); return next })
  }

  async function confirm() {
    if (submittingRef.current || invalidCount > 0 || candidates.length === 0 || complete) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      const nextResults = await confirmBatchTransactions(candidates, {
        createExpense: records.createExpense,
        createIncome: records.createIncome,
      }, successfulIds)
      setResults((current) => resultMap([...current.values(), ...nextResults]))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return <Dialog open={open} onOpenChange={(next) => { if (!next) close() }}>
    <DialogContent closeDisabled={submitting} className="sm:w-[min(72rem,calc(100vw-2rem))]" aria-describedby="batch-import-description">
      <DialogTitle>Batch Import</DialogTitle>
      <DialogDescription id="batch-import-description" className="mt-2 text-sm text-[var(--text-secondary)]">
        Paste up to {MAX_BATCH_TRANSACTIONS} Income and Expense rows, then review every transaction before anything is saved.
      </DialogDescription>

      {privacy.locked ? <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-6 text-center">
        <p className="text-sm font-semibold">Financial values are locked</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Unlock to continue reviewing this batch.</p>
        <Button className="mt-4" onClick={privacy.requestUnlock}>Unlock financial values</Button>
      </div> : stage === 'paste' ? <PasteStep input={input} setInput={setInput} error={parseError} onParse={parse} onCancel={close} /> : <ReviewStep
        candidates={candidates}
        summary={summary}
        invalidCount={invalidCount}
        results={results}
        complete={complete}
        failedCount={failedCount}
        submitting={submitting}
        onUpdate={updateCandidate}
        onRemove={removeCandidate}
        onBack={() => { setStage('paste'); setResults(new Map()) }}
        onConfirm={() => void confirm()}
        onClose={close}
      />}
    </DialogContent>
  </Dialog>
}

function PasteStep({ input, setInput, error, onParse, onCancel }: { input: string; setInput: (value: string) => void; error: string | null; onParse: () => void; onCancel: () => void }) {
  return <div className="mt-6">
    <label htmlFor="batch-import-input" className="form-label">Transactions</label>
    <textarea id="batch-import-input" rows={10} value={input} onChange={(event) => setInput(event.target.value)} placeholder={'2026-09-01 Salary +5000\n2026-09-02 Lunch -18.50\nSalary,5000,2026-09-01'} className="form-control min-h-56 resize-y font-mono text-sm" autoFocus />
    <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">Use one transaction per line. Signed text rows, comma-separated rows, and tab-separated rows are supported. Missing dates default visibly to today for review.</p>
    {error && <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-wash)] p-3 text-sm"><AlertTriangle className="mt-0.5 shrink-0 text-[var(--danger)]" size={17} />{error}</div>}
    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button onClick={onParse}><FileInput size={17} />Parse Transactions</Button></div>
  </div>
}

function ReviewStep({ candidates, summary, invalidCount, results, complete, failedCount, submitting, onUpdate, onRemove, onBack, onConfirm, onClose }: {
  candidates: BatchTransactionCandidate[]
  summary: BatchSummary
  invalidCount: number
  results: Map<string, BatchWriteResult>
  complete: boolean
  failedCount: number
  submitting: boolean
  onUpdate: (tempId: string, update: (candidate: BatchTransactionCandidate) => BatchTransactionCandidate) => void
  onRemove: (tempId: string) => void
  onBack: () => void
  onConfirm: () => void
  onClose: () => void
}) {
  const netCashflowSen = summary.incomeSen - summary.expenseSen
  const hasSuccessfulWrites = [...results.values()].some((result) => result.status === 'success')
  const successfulCount = [...results.values()].filter((result) => result.status === 'success').length
  const pendingCount = candidates.length - successfulCount
  return <div className="mt-5">
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Batch summary">
      <BatchMetric label="Detected" value={`${candidates.length}`} detail="transactions" />
      <BatchMetric label="Income" value={<FinancialAmount amountSen={summary.incomeSen} interactive={false} />} detail={`${summary.incomeCount} transactions`} />
      <BatchMetric label="Expenses" value={<FinancialAmount amountSen={summary.expenseSen} interactive={false} />} detail={`${summary.expenseCount} transactions`} />
      <BatchMetric label="Net Cashflow" value={<FinancialAmount amountSen={netCashflowSen} interactive={false} />} detail="from this batch" />
    </section>

    {invalidCount > 0 && <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-wash)] p-3 text-sm"><AlertTriangle className="mt-0.5 shrink-0 text-[var(--danger)]" size={17} />Resolve {invalidCount} invalid {invalidCount === 1 ? 'row' : 'rows'} before confirmation.</div>}
    {results.size > 0 && <div role="status" className={`mt-4 rounded-xl border p-3 text-sm ${failedCount > 0 ? 'border-[var(--danger-border)] bg-[var(--danger-wash)]' : 'border-[var(--border-subtle)] bg-[var(--accent-teal-wash)]'}`}>{complete ? `Imported ${candidates.length} transactions successfully.` : failedCount > 0 ? `${successfulCount} saved. ${failedCount} failed and remain available to edit or retry.` : `${successfulCount} saved. Review ${pendingCount} remaining ${pendingCount === 1 ? 'transaction' : 'transactions'}, then retry.`}</div>}

    {candidates.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-subtle)] p-8 text-center"><p className="text-sm font-semibold">No transactions remain</p><p className="mt-1 text-xs text-[var(--text-muted)]">Go back and paste another batch.</p></div> : <div className="mt-5 grid gap-3 lg:grid-cols-2">{candidates.map((candidate, index) => <CandidateCard key={candidate.tempId} candidate={candidate} index={index} result={results.get(candidate.tempId)} disabled={submitting || results.get(candidate.tempId)?.status === 'success'} onUpdate={(update) => onUpdate(candidate.tempId, update)} onRemove={() => onRemove(candidate.tempId)} />)}</div>}

    <div className="sticky bottom-0 -mx-6 mt-6 flex flex-col-reverse gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-6 pb-1 pt-4 sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:px-0">
      {complete ? <Button onClick={onClose}>Done</Button> : <>{!hasSuccessfulWrites && <Button variant="ghost" onClick={onBack} disabled={submitting}>Back to paste</Button>}<Button onClick={onConfirm} disabled={submitting || invalidCount > 0 || candidates.length === 0}>{submitting ? 'Saving transactions...' : hasSuccessfulWrites ? 'Retry Unsaved Transactions' : 'Confirm Transactions'}</Button></>}
    </div>
  </div>
}

function BatchMetric({ label, value, detail }: { label: string; value: ReactNode; detail: string }) {
  return <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4"><p className="section-label">{label}</p><div className="mt-2 text-lg font-semibold">{value}</div><p className="mt-1 text-xs text-[var(--text-muted)]">{detail}</p></article>
}

function CandidateCard({ candidate, index, result, disabled, onUpdate, onRemove }: { candidate: BatchTransactionCandidate; index: number; result?: BatchWriteResult; disabled: boolean; onUpdate: (update: (candidate: BatchTransactionCandidate) => BatchTransactionCandidate) => void; onRemove: () => void }) {
  const issues = candidateIssues(candidate)
  const prefix = `batch-row-${candidate.tempId}`
  const categories = candidate.direction === 'income' ? incomeCategoryOptions : expenseCategoryOptions
  return <article className={`rounded-2xl border p-4 ${issues.length > 0 || result?.status === 'failed' ? 'border-[var(--danger-border)] bg-[var(--danger-wash)]' : 'border-[var(--border-subtle)] bg-[var(--surface-secondary)]'}`}>
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-[var(--surface-primary)] text-xs font-semibold">{index + 1}</span><p className="text-sm font-semibold">Transaction review</p>{result?.status === 'success' && <span className="flex items-center gap-1 text-xs font-semibold text-[var(--positive)]"><CheckCircle2 size={14} />Saved</span>}</div><button type="button" aria-label={`Remove transaction ${index + 1}`} onClick={onRemove} disabled={disabled} className="grid size-9 place-items-center rounded-xl text-[var(--text-muted)] outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)] disabled:opacity-40"><Trash2 size={16} /></button></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div><label htmlFor={`${prefix}-direction`} className="form-label">Type</label><select id={`${prefix}-direction`} aria-label={`Transaction ${index + 1} type`} value={candidate.direction ?? ''} disabled={disabled} onChange={(event) => onUpdate((current) => updateCandidateDirection(current, event.target.value as BatchTransactionDirection))} className="form-control"><option value="">Select type</option><option value="income">Income</option><option value="expense">Expense</option></select></div>
      <div><label htmlFor={`${prefix}-amount`} className="form-label">Amount</label><input id={`${prefix}-amount`} aria-label={`Transaction ${index + 1} amount`} inputMode="decimal" value={candidate.amountInput} disabled={disabled} onChange={(event) => onUpdate((current) => updateCandidateAmount(current, event.target.value))} className="form-control" placeholder="0.00" /></div>
      <div><label htmlFor={`${prefix}-date`} className="form-label">Date</label><input id={`${prefix}-date`} aria-label={`Transaction ${index + 1} date`} type="date" value={candidate.date} disabled={disabled} onChange={(event) => onUpdate((current) => ({ ...current, date: event.target.value, dateDefaulted: false }))} className="form-control" /></div>
      <div><label htmlFor={`${prefix}-category`} className="form-label">Category</label><select id={`${prefix}-category`} aria-label={`Transaction ${index + 1} category`} value={candidate.category} disabled={disabled || candidate.direction === null} onChange={(event) => onUpdate((current) => ({ ...current, category: event.target.value as BatchTransactionCategory }))} className="form-control">{categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
    </div>
    <div className="mt-3"><label htmlFor={`${prefix}-description`} className="form-label">Description / source</label><input id={`${prefix}-description`} aria-label={`Transaction ${index + 1} description`} maxLength={120} value={candidate.description} disabled={disabled} onChange={(event) => onUpdate((current) => ({ ...current, description: event.target.value }))} className="form-control" /></div>
    <div className="mt-3"><label htmlFor={`${prefix}-note`} className="form-label">Note <span className="font-normal text-[var(--text-muted)]">(optional)</span></label><input id={`${prefix}-note`} aria-label={`Transaction ${index + 1} note`} maxLength={500} value={candidate.note} disabled={disabled} onChange={(event) => onUpdate((current) => ({ ...current, note: event.target.value }))} className="form-control" /></div>
    {(candidate.dateDefaulted || candidate.duplicate) && <div className="mt-3 space-y-1 text-xs text-[var(--warning)]">{candidate.dateDefaulted && <p>Date was missing and defaulted to today. Review before confirming.</p>}{candidate.duplicate && <p className="flex items-center gap-1"><Copy size={13} />Possible duplicate within this pasted batch. It has not been removed.</p>}</div>}
    {issues.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-[var(--danger)]">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
    {result?.status === 'failed' && <p role="alert" className="mt-3 text-xs font-medium text-[var(--danger)]">Write failed: {result.message}</p>}
  </article>
}
