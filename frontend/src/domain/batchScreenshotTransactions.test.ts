import { describe, expect, it } from 'vitest'
import { normalizeBatchScreenshotExtraction, screenshotExtractionToCandidates } from './batchScreenshotTransactions'
import { MAX_BATCH_TRANSACTIONS } from './batchTransactions'

const tngFixture = {
  rows: [
    { date: '2026-09-01', time: '09:10', description: 'Coffee Merchant', amountSen: 1400, amountSign: 'negative', currency: 'MYR', sourceText: 'Coffee Merchant -RM14.00', transactionKind: 'payment', dateInferred: false, uncertain: false, issues: [] },
    { date: '2026-09-01', time: '10:20', description: 'Received from Client', amountSen: 80000, amountSign: 'positive', currency: 'MYR', sourceText: 'Received +RM800.00', transactionKind: 'income', dateInferred: false, uncertain: false, issues: [] },
    { date: '2026-09-02', time: '08:00', description: 'GO+ Quick Cash In', amountSen: 1000, amountSign: 'positive', currency: 'MYR', sourceText: 'GO+ Quick Cash In +RM10.00', transactionKind: 'transfer', dateInferred: false, uncertain: false, issues: [] },
    { date: '2026-09-02', time: '08:02', description: 'Quick Reload Payment', amountSen: 5000, amountSign: 'negative', currency: 'MYR', sourceText: 'Quick Reload Payment -RM50.00', transactionKind: 'reload', dateInferred: false, uncertain: false, issues: [] },
    { date: '2026-09-02', time: null, description: 'Daily Earnings 每日收益', amountSen: 5, amountSign: 'positive', currency: 'MYR', sourceText: 'Daily Earnings 每日收益 +RM0.05', transactionKind: 'earnings', dateInferred: true, uncertain: false, issues: [] },
    { date: '2026-09-03', time: '12:00', description: '转出到余额', amountSen: 2000, amountSign: 'negative', currency: 'MYR', sourceText: '转出到余额 -RM20.00', transactionKind: 'unknown', dateInferred: false, uncertain: false, issues: [] },
    { date: '2026-09-03', time: null, description: 'Reward', amountSen: 14, amountSign: 'positive', currency: null, sourceText: '+14 points', transactionKind: 'reward', dateInferred: false, uncertain: false, issues: [] },
    { date: 'bad-date', time: '31:70', description: null, amountSen: null, amountSign: 'unknown', currency: null, sourceText: 'Unreadable row', transactionKind: 'unknown', dateInferred: false, uncertain: true, issues: ['Low confidence'] },
  ],
  totalVisibleRows: 8,
  partial: true,
  issues: ['One row was partly obscured.'],
}

describe('TNG-style batch screenshot normalization', () => {
  it('keeps multiple financial rows, mixed languages, dates and times while excluding points', () => {
    const extraction = normalizeBatchScreenshotExtraction(tngFixture)
    expect(extraction).not.toBeNull()
    expect(extraction?.rows).toHaveLength(7)
    expect(extraction?.excludedRewardRows).toBe(1)
    expect(extraction?.rows[0]).toMatchObject({ dispositionSuggestion: 'expense', amountSen: 1400, time: '09:10' })
    expect(extraction?.rows[1]).toMatchObject({ dispositionSuggestion: 'income', amountSen: 80000 })
    expect(extraction?.rows[2]).toMatchObject({ dispositionSuggestion: 'ignore' })
    expect(extraction?.rows[3]).toMatchObject({ dispositionSuggestion: 'ignore' })
    expect(extraction?.rows[4]).toMatchObject({ dispositionSuggestion: 'income', dateInferred: true })
    expect(extraction?.rows[5]).toMatchObject({ dispositionSuggestion: 'ignore' })
  })

  it('preserves partial and malformed rows for review instead of discarding the usable batch', () => {
    const extraction = normalizeBatchScreenshotExtraction(tngFixture)!
    const result = screenshotExtractionToCandidates(extraction, '2026-09-21')
    expect(result.candidates).toHaveLength(7)
    expect(result.candidates.at(-1)).toMatchObject({ date: '2026-09-21', dateDefaulted: true,
      direction: null, needsReview: true, sourceText: 'Unreadable row' })
    expect(result.warnings.join(' ')).toMatch(/partly obscured/i)
    expect(result.warnings.join(' ')).toMatch(/points/i)
  })

  it('keeps signed semantics in suggestions but positive integer sen in candidates', () => {
    const result = screenshotExtractionToCandidates(normalizeBatchScreenshotExtraction(tngFixture)!)
    expect(result.candidates[0]).toMatchObject({ direction: 'expense', amountSen: 1400, amountInput: '14.00' })
    expect(result.candidates[1]).toMatchObject({ direction: 'income', amountSen: 80000, amountInput: '800.00' })
    expect(result.candidates.every((candidate) => candidate.amountSen === null || candidate.amountSen > 0)).toBe(true)
  })

  it('refuses screenshots beyond the V1 row limit', () => {
    const extraction = normalizeBatchScreenshotExtraction({ rows: [], totalVisibleRows: MAX_BATCH_TRANSACTIONS + 1, partial: true, issues: [] })!
    expect(() => screenshotExtractionToCandidates(extraction)).toThrow('too-many')
  })
})
