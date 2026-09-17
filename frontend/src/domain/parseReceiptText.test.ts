import { describe, expect, it } from 'vitest'
import { combineLocalDateTime } from '../lib/date'
import { parseReceiptText } from './parseReceiptText'

const referenceDate = new Date(2026, 8, 18, 0, 15)

describe('receipt text parsing', () => {
  it('extracts merchant, integer sen total, and local receipt date', () => {
    const candidate = parseReceiptText('STARBUCKS\n17/09/2026\nLATTE 15.00\nSERVICE 0.90\nTOTAL RM 15.90', referenceDate)
    expect(candidate).toEqual({
      title: 'STARBUCKS', amountSen: 1590,
      occurredAt: combineLocalDateTime('2026-09-17', '00:15'),
      amountIssue: undefined,
    })
  })

  it('prefers total over subtotal and tax', () => {
    expect(parseReceiptText('CAFE\nSUBTOTAL RM 12.00\nTAX RM 0.72\nGRAND TOTAL RM12.72', referenceDate).amountSen).toBe(1272)
  })

  it('accepts amount due and ISO or dashed local dates', () => {
    expect(parseReceiptText('PARKING\n2026-09-17\nAMOUNT DUE: RM 4.50', referenceDate).amountSen).toBe(450)
    expect(parseReceiptText('PARKING\n17-09-2026\nTOTAL DUE 4.50', referenceDate).occurredAt)
      .toBe(combineLocalDateTime('2026-09-17', '00:15'))
  })

  it('does not guess between conflicting total lines', () => {
    const result = parseReceiptText('SHOP\nTOTAL RM10.00\nGRAND TOTAL RM12.00', referenceDate)
    expect(result.amountSen).toBeUndefined()
    expect(result.amountIssue).toBe('ambiguous')
  })

  it('leaves absent amounts and ambiguous dates for the form', () => {
    const result = parseReceiptText('TAX INVOICE\nRECEIPT\nSHOP\n17/09/2026\n18/09/2026\nSUBTOTAL RM9.00', referenceDate)
    expect(result).toEqual({ title: 'SHOP', amountSen: undefined, occurredAt: undefined, amountIssue: 'missing' })
  })

  it('does not use generic or malformed lines as the merchant or total', () => {
    expect(parseReceiptText('THANK YOU\nTAX INVOICE\nTOTAL RM 0.00\nnoise', referenceDate))
      .toEqual({ title: 'noise', amountSen: undefined, occurredAt: undefined, amountIssue: 'missing' })
    expect(parseReceiptText('', referenceDate).amountIssue).toBe('missing')
  })

  it('allows a merchant name containing a number', () => {
    expect(parseReceiptText('99 SPEEDMART\nTOTAL RM12.30', referenceDate).title).toBe('99 SPEEDMART')
  })
})
