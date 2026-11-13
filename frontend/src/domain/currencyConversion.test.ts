import { describe, expect, it } from 'vitest'
import { convertToSen, detectCurrency, isReferenceFresh, newConversion, referenceKey, resolvedAmountSen } from './currencyConversion'
import { parseExpenseText } from './parseExpenseText'
import { parseBatchTransactions, candidateIssues, updateCandidateAmount } from './batchTransactions'
import { normalizeBatchScreenshotExtraction, screenshotExtractionToCandidates } from './batchScreenshotTransactions'

describe('currency arithmetic and safe defaults', () => {
  it.each([
    ['25', 'USD', '4.5', 11250], ['0.1', 'USD', '4.15', 42],
    ['100', 'JPY', '0.0295', 295], ['25.01', 'USD', '4.321', 10807],
    ['25.001', 'USD', '4.5', null], ['25.1', 'JPY', '0.03', null],
    ['-25', 'USD', '4.5', null], ['25', 'USD', '0', null],
    ['999999999999999999999999', 'USD', '4.5', null],
  ])('converts %s %s at %s to %s sen', (amount, currency, rate, expected) => {
    expect(convertToSen(amount, currency, rate)).toBe(expected)
  })
  it.each([['USD25', 'USD'], ['US$25', 'USD'], ['SGD 25', 'SGD'], ['TOTAL RM25', 'MYR'], ['€25', 'EUR'], ['$25', null], ['¥25', null], ['USD 25 / SGD 30', null], ['Singapore Cafe', null]])('detects explicit currency in %s', (text, expected) => {
    expect(detectCurrency(text)).toBe(expected)
  })
  it('does not convert a resolved MYR amount twice and rejects mismatched/date-stale quotes', () => {
    const draft = { ...newConversion('USD'), reference: { base: 'USD', quote: 'MYR' as const, rate: '4.5', date: '2026-11-13' }, referenceKey: 'USD:2026-11-14' }
    expect(resolvedAmountSen('25', draft, '2026-11-14')).toBe(11250)
    expect(resolvedAmountSen('25', draft, '2026-11-12')).toBeNull()
    expect(resolvedAmountSen('112.50', newConversion(), '2026-11-14')).toBe(11250)
    expect(resolvedAmountSen('25', { ...draft, bankMyr: '113.21' }, '2026-11-12')).toBe(11321)
    expect(resolvedAmountSen('25', newConversion(''), '2026-11-14')).toBeNull()
  })
  it('allows prior business days but rejects future, stale and invalid rate dates', () => {
    const rate = { base: 'USD', quote: 'MYR' as const, rate: '4.5', date: '2026-11-13' }
    expect(isReferenceFresh(rate, '2026-11-14')).toBe(true)
    expect(isReferenceFresh(rate, '2026-11-12')).toBe(false)
    expect(isReferenceFresh(rate, '2026-11-21')).toBe(false)
    expect(isReferenceFresh({ ...rate, date: '2026-02-30' }, '2026-11-14')).toBe(false)
  })
  it.each(['lunch USD 25', 'lunch USD25', 'lunch $25', 'lunch SGD 25', 'lunch JPY 2500'])('never treats foreign text %s as MYR', (text) => {
    expect(parseExpenseText(text, new Date()).ok).toBe(false)
  })
  it('preserves old batch candidates and keeps multi-currency source amounts separate', () => {
    const rows = parseBatchTransactions('2026-11-13 Coffee -USD 25\n2026-11-13 Books -SGD 10\n2026-11-13 Lunch -12.50').candidates
    expect(rows[0]).toMatchObject({ amountInput: '25', amountSen: null, conversion: { currency: 'USD' }, direction: 'expense' })
    expect(rows[1]).toMatchObject({ amountInput: '10', amountSen: null, conversion: { currency: 'SGD' } })
    expect(rows[2]).toMatchObject({ amountSen: 1250 })
    const conversion = { ...newConversion('USD'), reference: { base: 'USD', quote: 'MYR' as const, rate: '4.5', date: '2026-11-13' }, referenceKey: referenceKey(newConversion('USD'), rows[0].date) }
    const resolved = updateCandidateAmount({ ...rows[0], conversion }, '25')
    expect(resolved.amountSen).toBe(11250)
    expect(updateCandidateAmount(resolved, '25').amountSen).toBe(11250)
    expect(candidateIssues({ ...resolved, amountSen: 2500 })).toContain('Resolve the currency conversion or enter the actual MYR amount.')
  })
  it('interprets legacy OCR minor units using currency precision and blocks unknown currency', () => {
    const rows = ['USD', 'JPY', null].map((currency) => ({ description: 'Synthetic shop', amountSen: 2500, currency, amountSign: 'negative', transactionKind: 'payment', date: '2026-11-13', uncertain: false }))
    const result = screenshotExtractionToCandidates(normalizeBatchScreenshotExtraction({ rows })!)
    expect(result.candidates.map((row) => row.amountInput)).toEqual(['25.00', '2500', '25.00'])
    expect(result.candidates.every((row) => row.amountSen === null)).toBe(true)
    expect(result.candidates[2].conversion?.currency).toBe('')
  })
})
