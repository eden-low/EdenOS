import { useState } from 'react'
import { expenseWriteErrorMessage } from '../../lib/expenseWriteError'
import { incomeWriteErrorMessage } from '../../lib/incomeWriteError'
import { useRecords } from '../../state/useRecords'
import type { ExpenseData, IncomeData } from '../../types/records'
import { ExpenseForm } from '../capture/ExpenseForm'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog'
import { IncomeForm } from './IncomeForm'

export function FinanceEntryDialog({ kind, open, onClose }: { kind: 'expense' | 'income'; open: boolean; onClose: () => void }) {
  const records = useRecords()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function saveExpense(data: ExpenseData) {
    setSaving(true); setError(null)
    try { await records.createExpense(data); onClose() }
    catch (caught) { setError(expenseWriteErrorMessage(caught, 'create')) }
    finally { setSaving(false) }
  }
  async function saveIncome(data: IncomeData) {
    setSaving(true); setError(null)
    try { await records.createIncome(data); onClose() }
    catch (caught) { setError(incomeWriteErrorMessage(caught, 'create')) }
    finally { setSaving(false) }
  }
  const income = kind === 'income'
  return <Dialog open={open} onOpenChange={(next) => !next && !saving && onClose()}>
    <DialogContent closeDisabled={saving} className="sm:w-[min(38rem,calc(100vw-2rem))]">
      <DialogTitle className="pr-12 text-xl font-semibold">Add {income ? 'income' : 'expense'}</DialogTitle>
      <DialogDescription className="mb-6 mt-2 text-sm text-[var(--text-secondary)]">
        {income ? 'Record confirmed income using integer-sen precision.' : 'Record a confirmed expense without changing Receipt or Text Capture.'}
      </DialogDescription>
      {income
        ? <IncomeForm submitLabel="Add income" onSubmit={saveIncome} onCancel={onClose} isSubmitting={saving} submitError={error} />
        : <ExpenseForm submitLabel="Add expense" onSubmit={saveExpense} onCancel={onClose} isSubmitting={saving} submitError={error} />}
    </DialogContent>
  </Dialog>
}
