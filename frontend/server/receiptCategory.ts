import { isExpenseCategory } from '../src/domain/expense'
import type { ExpenseCategory } from '../src/types/records'

const clues: Array<[ExpenseCategory, RegExp]> = [
  ['other', /\b(?:barber|barbershop|salon|haircut|hairdressing|hairdresser|hair trim|potong rambut)\b/i],
  ['health', /\b(?:pharmacy|chemist|clinic|hospital|medicine|medication|prescription|ubat)\b/i],
  ['transport', /\b(?:petrol|fuel|gas station|service station|shell|petronas|petron|caltex|bhp)\b/i],
  ['food', /\b(?:restaurant|cafe|coffee shop|bakery|bistro|warung|mamak|grocer|grocery|supermarket|food court|meal|lunch|dinner|breakfast)\b/i],
]

export function receiptCategory(merchant: string | null, purchaseContext: string | null, aiCategory: unknown): ExpenseCategory | null {
  const text = [merchant, purchaseContext].filter(Boolean).join(' ')
  const matches = clues.filter(([, pattern]) => pattern.test(text)).map(([category]) => category)
  const unique = [...new Set(matches)]
  if (unique.length === 1) return unique[0]
  if (unique.length > 1) return null
  return isExpenseCategory(aiCategory) ? aiCategory : null
}
