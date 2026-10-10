// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { receiptCategory } from './receiptCategory'

describe('receipt category classification', () => {
  it.each([
    ['ABC Restaurant', 'lunch set', 'shopping', 'food'],
    ['KL Barbershop', 'haircut', 'food', 'other'],
    ['Petronas', 'petrol RON95', 'food', 'transport'],
    ['Guardian Pharmacy', 'medicine', 'food', 'health'],
    ['Fresh Grocery', 'vegetables', 'shopping', 'food'],
  ])('classifies %s by merchant and items', (merchant, context, ai, expected) => {
    expect(receiptCategory(merchant, context, ai)).toBe(expected)
  })

  it('keeps unknown and ambiguous receipts unselected', () => {
    expect(receiptCategory('ABC Sdn Bhd', null, null)).toBeNull()
    expect(receiptCategory('Cafe and Pharmacy', null, null)).toBeNull()
    expect(receiptCategory(null, null, 'personal-care')).toBeNull()
  })

  it('accepts an existing category without a stronger clue', () => {
    expect(receiptCategory('ABC Sdn Bhd', 'stationery', 'education')).toBe('education')
  })
})
