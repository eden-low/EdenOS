import { createHash } from 'node:crypto'

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    const input = value as Record<string, unknown>
    return Object.fromEntries(Object.keys(input).sort().flatMap((key) => input[key] === undefined ? [] : [[key, stableValue(input[key])]]))
  }
  return value
}

export function stableJson(value: unknown): string {
  return JSON.stringify(stableValue(value))
}

export function contentHash(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex')
}
