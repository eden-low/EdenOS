import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { convertToSen, currencyCodes, isReferenceFresh, referenceKey, type ConversionDraft } from '../../domain/currencyConversion'
import { getReferenceRate } from '../../services/exchangeRates'
import { formatMoneyExact } from '../../lib/format'
import { Button } from '../ui/button'

export function CurrencyConversion({ id, amount, date, value, onChange, disabled = false }: {
  id: string; amount: string; date: string; value: ConversionDraft
  onChange: (value: ConversionDraft) => void; disabled?: boolean
}) {
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null)
  const [retry, setRetry] = useState(0)
  const current = useRef({ value, onChange })
  useLayoutEffect(() => { current.current = { value, onChange } })
  const key = referenceKey(value, date)
  const error = failure?.key === key ? failure.message : null
  const foreign = value.currency !== 'MYR'
  useEffect(() => {
    if (!foreign || !value.currency || value.currency === 'OTHER' || disabled) return
    let active = true
    getReferenceRate(value.currency, value.mode === 'historical' ? date : undefined).then((reference) => {
      if (active) current.current.onChange({ ...current.current.value, reference, referenceKey: key })
    }).catch((cause: unknown) => {
      if (active) setFailure({ key, message: cause instanceof Error ? cause.message : 'Exchange-rate service is unavailable.' })
    })
    return () => { active = false }
  }, [key, date, foreign, value.currency, value.mode, retry, disabled])
  const reference = value.referenceKey === key && value.reference?.base === value.currency &&
    isReferenceFresh(value.reference, value.mode === 'historical' ? date : new Date().toISOString().slice(0, 10)) ? value.reference : undefined
  const suggestion = reference ? convertToSen(amount, value.currency, reference.rate) : null

  return <div className="mt-4 min-w-0 space-y-3 rounded-xl border border-[var(--border-subtle)] p-3">
    <div><label htmlFor={`${id}-currency`} className="form-label">Currency</label>
      <select id={`${id}-currency`} value={value.currency} disabled={disabled} className="form-control" onChange={(event) => onChange({ currency: event.target.value, mode: value.mode, bankMyr: '' })}>
        <option value="">Choose currency / 请选择币种</option>
        {currencyCodes.map((code) => <option key={code} value={code}>{code}</option>)}
        <option value="OTHER">Other / unsupported currency</option>
      </select>
    </div>
    {!value.currency && <p role="status" className="text-sm text-[var(--text-secondary)]">Currency is uncertain. Choose it before review; the image amount has not been converted.</p>}
    {foreign && value.currency && <>
      <p className="break-words text-sm">Original amount: {value.currency} {amount || '—'}</p>
      {value.currency !== 'OTHER' && <div><label htmlFor={`${id}-rate-mode`} className="form-label">Exchange-rate date</label>
        <select id={`${id}-rate-mode`} value={value.mode} disabled={disabled} className="form-control" onChange={(event) => onChange({ ...value, mode: event.target.value as ConversionDraft['mode'], reference: undefined, referenceKey: undefined })}>
          <option value="historical">Consumption date ({date})</option><option value="latest">Latest available reference</option>
        </select></div>}
      <div role="status" className="break-words text-sm text-[var(--text-secondary)]">
        {reference ? <p>Frankfurter v2 · 1 {value.currency} = {reference.rate} MYR · Rate date: {reference.date}. Suggested MYR: {suggestion ? formatMoneyExact(suggestion) : 'Enter a valid original amount.'}</p>
          : <p>{error ?? (value.currency === 'OTHER' ? 'No reference rate for this currency.' : 'Loading reference rate…')} Enter the actual MYR amount below to continue manually.</p>}
      </div>
      {error && <Button type="button" variant="secondary" disabled={disabled} onClick={() => setRetry((count) => count + 1)}>Retry exchange rate</Button>}
      <div><label htmlFor={`${id}-bank-myr`} className="form-label">Actual bank MYR amount (optional override)</label>
        <input id={`${id}-bank-myr`} inputMode="decimal" value={value.bankMyr} disabled={disabled} className="form-control" placeholder="MYR 0.00" onChange={(event) => onChange({ ...value, bankMyr: event.target.value })} />
      </div>
      {value.bankMyr && <p className="text-sm">Using your actual MYR amount. Reference changes will not replace it.</p>}
      <p className="text-xs text-[var(--text-muted)]">Reference rates exclude bank fees. Only the reviewed MYR amount is saved.</p>
    </>}
  </div>
}
