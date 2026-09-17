import { combineLocalDateTime, toLocalTimeInput } from '../lib/date'
import { parseRinggitToSen } from '../lib/format'
import type { ReceiptCandidate } from '../types/receipt'

const genericLine = /^(?:receipt|tax invoice|invoice|thank you|welcome|subtotal|total|grand total|amount due|total due|tax|sst|change|cash|discount|date|time|tel|phone)\b/i
const totalLine = /^(?:grand\s+total|total\s+due|amount\s+due|total)\b\s*[:-]?\s*(?:RM\s*)?(\d+(?:\.\d{1,2})?)\s*$/i
const receiptDate = /\b(\d{4})-(\d{2})-(\d{2})\b|\b(\d{2})[/-](\d{2})[/-](\d{4})\b/g

function parsedDate(line: string, referenceDate: Date): string[] {
  const dates: string[] = []
  for (const match of line.matchAll(receiptDate)) {
    const dateValue = match[1]
      ? `${match[1]}-${match[2]}-${match[3]}`
      : `${match[6]}-${match[5]}-${match[4]}`
    const occurredAt = combineLocalDateTime(dateValue, toLocalTimeInput(referenceDate))
    if (occurredAt) dates.push(occurredAt)
  }
  return dates
}

export function parseReceiptText(rawText: string, referenceDate: Date): ReceiptCandidate {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const title = lines.slice(0, 8).find((line) =>
    /\p{L}/u.test(line) &&
    !genericLine.test(line) &&
    !/\bRM\s*\d|\d+[.,]\d{2}\b/i.test(line) &&
    line.length <= 80,
  ) ?? ''

  const totals = lines.flatMap((line) => {
    const match = line.match(totalLine)
    if (!match) return []
    const amountSen = parseRinggitToSen(match[1])
    return amountSen === null ? [] : [amountSen]
  })
  const distinctTotals = [...new Set(totals)]
  const dates = [...new Set(lines.flatMap((line) => parsedDate(line, referenceDate)))]

  return {
    title,
    amountSen: distinctTotals.length === 1 ? distinctTotals[0] : undefined,
    occurredAt: dates.length === 1 ? dates[0] : undefined,
    amountIssue: distinctTotals.length === 0 ? 'missing' : distinctTotals.length > 1 ? 'ambiguous' : undefined,
  }
}
