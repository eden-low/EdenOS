import { formatMoney, formatMoneyExact } from '../../lib/format'
import { usePrivacyLock } from '../../privacy/usePrivacyLock'
import { cn } from '../../lib/utils'

export function FinancialAmount({ amountSen, className, label, exact = false, prefix = '', interactive = true }: { amountSen: number; className?: string; label?: string; exact?: boolean; prefix?: string; interactive?: boolean }) {
  const privacy = usePrivacyLock()
  if (!privacy.locked) return <span className={className}>{prefix}{exact ? formatMoneyExact(amountSen) : formatMoney(amountSen)}</span>
  if (!interactive) return <span className={cn('tracking-[0.08em]', className)}>{prefix}RM ••••</span>
  return <button type="button" aria-label={label ?? 'Unlock financial value'} onClick={privacy.requestUnlock} className={cn('rounded-md text-left tracking-[0.08em] outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)]', className)}>{prefix}RM ••••</button>
}
