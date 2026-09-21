import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { incomeCategoryLabels } from '../../domain/income'
import { formatLongDate, formatTime } from '../../lib/date'
import { incomeWriteErrorMessage } from '../../lib/incomeWriteError'
import { usePrivacyLock } from '../../privacy/usePrivacyLock'
import { useRecords } from '../../state/useRecords'
import type { IncomeData, IncomeRecord } from '../../types/records'
import { FinancialAmount } from '../privacy/FinancialAmount'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog'
import { InlineError } from '../ui/InlineError'
import { IncomeForm } from './IncomeForm'

export function IncomeRecordDialog({ record, onClose }: { record?: IncomeRecord; onClose: () => void }) {
  const { updateIncome, deleteIncome } = useRecords()
  const privacy = usePrivacyLock()
  const [step, setStep] = useState<'view' | 'edit' | 'delete'>('view')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function save(data: IncomeData) {
    if (!record) return
    setWorking(true); setError(null)
    try { await updateIncome(record.id, data); setStep('view') }
    catch (caught) { setError(incomeWriteErrorMessage(caught, 'update')) }
    finally { setWorking(false) }
  }
  async function remove() {
    if (!record) return
    setWorking(true); setError(null)
    try { await deleteIncome(record.id); onClose() }
    catch (caught) { setError(incomeWriteErrorMessage(caught, 'delete')) }
    finally { setWorking(false) }
  }
  return <Dialog open={Boolean(record)} onOpenChange={(open) => !open && !working && onClose()}>
    <DialogContent closeDisabled={working} className="sm:w-[min(38rem,calc(100vw-2rem))]">
      {record && step === 'view' && <>
        <DialogTitle className="pr-12 text-xl font-semibold">Income record</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-[var(--text-secondary)]">Confirmed record details</DialogDescription>
        <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 sm:p-6">
          <p className="section-label text-[var(--positive)]">{incomeCategoryLabels[record.category]}</p>
          <h3 className="mt-3 text-xl font-semibold">{record.description}</h3>
          <FinancialAmount amountSen={record.amountSen} exact className="metric-value mt-3 text-4xl font-semibold text-[var(--positive)]" />
          <p className="mt-5 border-t border-[var(--border-subtle)] pt-4 text-sm text-[var(--text-secondary)]">{formatLongDate(record.occurredAt)} · {formatTime(record.occurredAt)}</p>
          {record.note && <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{record.note}</p>}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button variant="danger" onClick={() => setStep('delete')}><Trash2 size={17} />Delete</Button>
          <Button variant="secondary" onClick={() => { if (privacy.locked) privacy.requestUnlock(); else setStep('edit') }}><Pencil size={17} />Edit income</Button>
        </div>
      </>}
      {record && step === 'edit' && <><DialogTitle className="pr-12 text-xl font-semibold">Edit income</DialogTitle><DialogDescription className="mb-6 mt-2 text-sm text-[var(--text-secondary)]">Changes update finance totals after saving.</DialogDescription><IncomeForm initialData={record} submitLabel="Save changes" onSubmit={save} onCancel={() => setStep('view')} isSubmitting={working} submitError={error} /></>}
      {record && step === 'delete' && <><DialogTitle className="pr-12 text-xl font-semibold">Delete income?</DialogTitle><DialogDescription className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">This removes {record.description} from income totals and transaction history.</DialogDescription>{error && <InlineError message={error} />}<div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setStep('view')} disabled={working}>Cancel</Button><Button variant="danger" onClick={() => void remove()} disabled={working}>{working ? 'Deleting…' : 'Delete income'}</Button></div></>}
    </DialogContent>
  </Dialog>
}
