import { AlertTriangle, CheckCircle2, Copy, FileInput, FileText, ImageUp, Trash2 } from 'lucide-react'
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
  type BatchTransactionDisposition,
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
import { BatchScreenshotInput } from './BatchScreenshotInput'

type Stage = 'input' | 'review'
type InputMode = 'text' | 'screenshot'

interface BatchSummary {
  incomeCount: number
  incomeSen: number
  expenseCount: number
  expenseSen: number
  ignoredCount: number
}

function summarize(candidates: BatchTransactionCandidate[]): BatchSummary {
  return candidates.reduce<BatchSummary>((summary, candidate) => {
    if (candidate.direction === 'ignore') {
      summary.ignoredCount += 1
      return summary
    }
    if (candidate.amountSen === null || candidate.direction === null) return summary
    if (candidate.direction === 'income') {
      summary.incomeCount += 1
      summary.incomeSen += candidate.amountSen
    } else {
      summary.expenseCount += 1
      summary.expenseSen += candidate.amountSen
    }
    return summary
  }, { incomeCount: 0, incomeSen: 0, expenseCount: 0, expenseSen: 0, ignoredCount: 0 })
}

function resultMap(results: BatchWriteResult[]): Map<string, BatchWriteResult> {
  return new Map(results.map((result) => [result.tempId, result]))
}

export function BatchImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const records = useRecords()
  const privacy = usePrivacyLock()
  const [stage, setStage] = useState<Stage>('input')
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [input, setInput] = useState('')
  const [candidates, setCandidates] = useState<BatchTransactionCandidate[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [reviewWarnings, setReviewWarnings] = useState<string[]>([])
  const [results, setResults] = useState<Map<string, BatchWriteResult>>(new Map())
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const summary = useMemo(() => summarize(candidates), [candidates])
  const invalidCount = candidates.filter((candidate) => !isBatchCandidateValid(candidate)).length
  const settledIds = useMemo(() => new Set([...results.values()].filter((result) => result.status !== 'failed').map((result) => result.tempId)), [results])
  const failedCount = [...results.values()].filter((result) => result.status === 'failed').length
  const complete = candidates.length > 0 && settledIds.size === candidates.length

  function close() {
    if (submittingRef.current) return
    setStage('input')
    setInputMode('text')
    setInput('')
    setCandidates([])
    setParseError(null)
    setReviewWarnings([])
    setResults(new Map())
    onClose()
  }

  function parse() {
    const parsed = parseBatchTransactions(input)
    setParseError(parsed.error)
    if (parsed.error) return
    setCandidates(parsed.candidates)
    setReviewWarnings([])
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
      }, settledIds)
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
        Paste text or upload one activity screenshot with up to {MAX_BATCH_TRANSACTIONS} rows. Review every disposition before anything is saved.
      </DialogDescription>

      {privacy.locked ? <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-6 text-center">
        <p className="text-sm font-semibold">Financial values are locked</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Unlock to continue reviewing this batch.</p>
        <Button className="mt-4" onClick={privacy.requestUnlock}>Unlock financial values</Button>
      </div> : stage === 'input' ? <div className="mt-5">
        <div className="inline-flex rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-1" aria-label="Batch Import input mode">
          <button type="button" aria-pressed={inputMode === 'text'} onClick={() => setInputMode('text')} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)] ${inputMode === 'text' ? 'bg-[var(--surface-primary)] shadow-sm' : 'text-[var(--text-secondary)]'}`}><FileText size={16} />Paste Text</button>
          <button type="button" aria-pressed={inputMode === 'screenshot'} onClick={() => setInputMode('screenshot')} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)] ${inputMode === 'screenshot' ? 'bg-[var(--surface-primary)] shadow-sm' : 'text-[var(--text-secondary)]'}`}><ImageUp size={16} />Upload Screenshot</button>
        </div>
        {inputMode === 'text'
          ? <PasteStep input={input} setInput={setInput} error={parseError} onParse={parse} onCancel={close} />
          : <BatchScreenshotInput onCancel={close} onContinue={(extraction) => {
            setCandidates(extraction.candidates)
            setReviewWarnings(extraction.warnings)
            setResults(new Map())
            setStage('review')
          }} />}
      </div> : <ReviewStep
        candidates={candidates}
        summary={summary}
        invalidCount={invalidCount}
        results={results}
        warnings={reviewWarnings}
        complete={complete}
        failedCount={failedCount}
        submitting={submitting}
        onUpdate={updateCandidate}
        onRemove={removeCandidate}
        onBack={() => { setStage('input'); setResults(new Map()); setReviewWarnings([]) }}
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

function ReviewStep({ candidates, summary, invalidCount, results, warnings, complete, failedCount, submitting, onUpdate, onRemove, onBack, onConfirm, onClose }: {
  candidates: BatchTransactionCandidate[]
  summary: BatchSummary
  invalidCount: number
  results: Map<string, BatchWriteResult>
  warnings: string[]
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
  const hasSettledRows = [...results.values()].some((result) => result.status !== 'failed')
  const successfulCount = [...results.values()].filter((result) => result.status === 'success').length
  const ignoredResultCount = [...results.values()].filter((result) => result.status === 'ignored').length
  const pendingCount = candidates.length - successfulCount - ignoredResultCount
  return <div className="mt-5">
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Batch summary">
      <BatchMetric label="Detected" value={`${candidates.length}`} detail="rows" />
      <BatchMetric label="Income" value={<FinancialAmount amountSen={summary.incomeSen} interactive={false} />} detail={`${summary.incomeCount} transactions`} />
      <BatchMetric label="Expenses" value={<FinancialAmount amountSen={summary.expenseSen} interactive={false} />} detail={`${summary.expenseCount} transactions`} />
      <BatchMetric label="Ignored / Transfers" value={`${summary.ignoredCount}`} detail="not written" />
      <BatchMetric label="Net Cashflow" value={<FinancialAmount amountSen={netCashflowSen} interactive={false} />} detail="from this batch" />
    </section>

    {warnings.length > 0 && <div role="status" className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--warning-wash)] p-3 text-sm"><p className="font-semibold">Review extracted rows before continuing.</p><ul className="mt-1 list-disc space-y-1 pl-5 text-[var(--text-secondary)]">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
    {invalidCount > 0 && <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-wash)] p-3 text-sm"><AlertTriangle className="mt-0.5 shrink-0 text-[var(--danger)]" size={17} />Resolve {invalidCount} invalid {invalidCount === 1 ? 'row' : 'rows'} before confirmation.</div>}
    {results.size > 0 && <div role="status" className={`mt-4 rounded-xl border p-3 text-sm ${failedCount > 0 ? 'border-[var(--danger-border)] bg-[var(--danger-wash)]' : 'border-[var(--border-subtle)] bg-[var(--accent-teal-wash)]'}`}>{complete ? ignoredResultCount === 0 ? `Imported ${successfulCount} transactions successfully.` : `${successfulCount} saved. ${ignoredResultCount} ignored or treated as transfers.` : failedCount > 0 ? `${successfulCount} saved. ${ignoredResultCount} ignored. ${failedCount} failed and remain available to edit or retry.` : `${successfulCount} saved. ${ignoredResultCount} ignored. Review ${pendingCount} remaining ${pendingCount === 1 ? 'transaction' : 'transactions'}, then retry.`}</div>}

    {candidates.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-subtle)] p-8 text-center"><p className="text-sm font-semibold">No transactions remain</p><p className="mt-1 text-xs text-[var(--text-muted)]">Go back and prepare another batch.</p></div> : <div className="mt-5 grid gap-3 lg:grid-cols-2">{candidates.map((candidate, index) => {
      const result = results.get(candidate.tempId)
      return <CandidateCard key={candidate.tempId} candidate={candidate} index={index} result={result}
        disabled={submitting || (result !== undefined && result.status !== 'failed')}
        onUpdate={(update) => onUpdate(candidate.tempId, (current) => ({ ...update(current), needsReview: false }))}
        onRemove={() => onRemove(candidate.tempId)} />
    })}</div>}

    <div className="sticky bottom-0 -mx-6 mt-6 flex flex-col-reverse gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-6 pb-1 pt-4 sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:px-0">
      {complete ? <Button onClick={onClose}>Done</Button> : <>{!hasSettledRows && <Button variant="ghost" onClick={onBack} disabled={submitting}>Back to input</Button>}<Button onClick={onConfirm} disabled={submitting || invalidCount > 0 || candidates.length === 0}>{submitting ? 'Saving transactions...' : hasSettledRows ? 'Retry Unsaved Transactions' : 'Confirm Transactions'}</Button></>}
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
  const ignored = candidate.direction === 'ignore'
  const alertStyle = issues.length > 0 || result?.status === 'failed'
  return <article className={`rounded-2xl border p-4 ${ignored ? 'border-[var(--border-subtle)] bg-[var(--surface-secondary)] opacity-75' : alertStyle ? 'border-[var(--danger-border)] bg-[var(--danger-wash)]' : 'border-[var(--border-subtle)] bg-[var(--surface-secondary)]'}`}>
    <div className="flex items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-[var(--surface-primary)] text-xs font-semibold">{index + 1}</span><p className="text-sm font-semibold">Transaction review</p>{candidate.extracted && <span className={`rounded-full px-2 py-1 text-[0.68rem] font-semibold ${candidate.needsReview ? 'bg-[var(--warning-wash)] text-[var(--warning)]' : 'bg-[var(--accent-teal-wash)] text-[var(--accent-teal)]'}`}>{candidate.needsReview ? 'Needs review' : 'Extracted'}</span>}{ignored && <span className="rounded-full bg-[var(--surface-primary)] px-2 py-1 text-[0.68rem] font-semibold text-[var(--text-secondary)]">Ignored / Transfer</span>}{result?.status === 'success' && <span className="flex items-center gap-1 text-xs font-semibold text-[var(--positive)]"><CheckCircle2 size={14} />Saved</span>}{result?.status === 'ignored' && <span className="flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)]"><CheckCircle2 size={14} />Not written</span>}</div><button type="button" aria-label={`Remove transaction ${index + 1}`} onClick={onRemove} disabled={disabled} className="grid size-9 place-items-center rounded-xl text-[var(--text-muted)] outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)] disabled:opacity-40"><Trash2 size={16} /></button></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div><label htmlFor={`${prefix}-direction`} className="form-label">Disposition</label><select id={`${prefix}-direction`} aria-label={`Transaction ${index + 1} disposition`} value={candidate.direction ?? ''} disabled={disabled} onChange={(event) => onUpdate((current) => updateCandidateDirection(current, event.target.value as BatchTransactionDisposition))} className="form-control"><option value="">Needs review</option><option value="income">Income</option><option value="expense">Expense</option><option value="ignore">Ignore / Transfer</option></select></div>
      <div><label htmlFor={`${prefix}-amount`} className="form-label">Amount</label><input id={`${prefix}-amount`} aria-label={`Transaction ${index + 1} amount`} inputMode="decimal" value={candidate.amountInput} disabled={disabled} onChange={(event) => onUpdate((current) => updateCandidateAmount(current, event.target.value))} className="form-control" placeholder="0.00" /></div>
      <div><label htmlFor={`${prefix}-date`} className="form-label">Date</label><input id={`${prefix}-date`} aria-label={`Transaction ${index + 1} date`} type="date" value={candidate.date} disabled={disabled} onChange={(event) => onUpdate((current) => ({ ...current, date: event.target.value, dateDefaulted: false }))} className="form-control" /></div>
      <div><label htmlFor={`${prefix}-time`} className="form-label">Time <span className="font-normal text-[var(--text-muted)]">(optional)</span></label><input id={`${prefix}-time`} aria-label={`Transaction ${index + 1} time`} type="time" value={candidate.time ?? ''} disabled={disabled} onChange={(event) => onUpdate((current) => ({ ...current, time: event.target.value || null }))} className="form-control" /></div>
      <div className="sm:col-span-2"><label htmlFor={`${prefix}-category`} className="form-label">Category</label><select id={`${prefix}-category`} aria-label={`Transaction ${index + 1} category`} value={candidate.category} disabled={disabled || candidate.direction === null || ignored} onChange={(event) => onUpdate((current) => ({ ...current, category: event.target.value as BatchTransactionCategory }))} className="form-control">{categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
    </div>
    <div className="mt-3"><label htmlFor={`${prefix}-description`} className="form-label">Description / source</label><input id={`${prefix}-description`} aria-label={`Transaction ${index + 1} description`} maxLength={120} value={candidate.description} disabled={disabled} onChange={(event) => onUpdate((current) => ({ ...current, description: event.target.value }))} className="form-control" /></div>
    <div className="mt-3"><label htmlFor={`${prefix}-note`} className="form-label">Note <span className="font-normal text-[var(--text-muted)]">(optional)</span></label><input id={`${prefix}-note`} aria-label={`Transaction ${index + 1} note`} maxLength={500} value={candidate.note} disabled={disabled} onChange={(event) => onUpdate((current) => ({ ...current, note: event.target.value }))} className="form-control" /></div>
    {candidate.sourceText && <p className="mt-3 rounded-lg bg-[var(--surface-primary)] px-3 py-2 text-xs text-[var(--text-muted)]">Visible row: {candidate.sourceText}</p>}
    {(candidate.dateDefaulted || candidate.dateInferred || candidate.duplicate || (candidate.extractionIssues?.length ?? 0) > 0) && <div className="mt-3 space-y-1 text-xs text-[var(--warning)]">{candidate.dateDefaulted && <p>Date was missing and defaulted to today. Review before confirming.</p>}{candidate.dateInferred && <p>The year or date was inferred from visible screenshot context. Review it.</p>}{candidate.duplicate && <p className="flex items-center gap-1"><Copy size={13} />Possible duplicate within this batch. It has not been removed.</p>}{candidate.extractionIssues?.map((issue) => <p key={issue}>{issue}</p>)}</div>}
    {issues.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-[var(--danger)]">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
    {result?.status === 'failed' && <p role="alert" className="mt-3 text-xs font-medium text-[var(--danger)]">Write failed: {result.message}</p>}
  </article>
}
