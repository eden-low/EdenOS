import { describe, expect, it } from 'vitest'
import { parseExerciseText } from './parseExerciseText'

const referenceDate = new Date(2026, 8, 17, 14, 35, 42)
const occurredAt = new Date(2026, 8, 17, 14, 35).toISOString()

describe('Exercise text candidates', () => {
  it.each([
    ['羽毛球', 'Badminton'], ['打羽毛球', 'Badminton'], ['badminton', 'Badminton'],
    ['跑步', 'Running'], ['running', 'Running'], ['run', 'Running'],
    ['gym', 'Gym'], ['健身', 'Gym'],
  ])('normalizes %s to %s', (alias, activity) => {
    expect(parseExerciseText(`${alias} 45min`, referenceDate)).toEqual({
      kind: 'complete',
      data: { activity, durationSeconds: 2700, occurredAt, source: 'text' },
    })
  })

  it.each([
    ['羽毛球1小时', 3600],
    ['羽毛球1.5小时', 5400],
    ['打羽毛球一个半小时', 5400],
    ['跑步90分钟', 5400],
    ['跑步1h30', 5400],
    ['gym 2h15', 8100],
    ['running 45min', 2700],
    ['run 1h30m', 5400],
    ['健身2小时15分钟', 8100],
  ])('reads %s into durationSeconds %i without a distance', (input, durationSeconds) => {
    const result = parseExerciseText(input, referenceDate)
    expect(result.kind).toBe('complete')
    if (result.kind !== 'complete') return
    expect(result.data.durationSeconds).toBe(durationSeconds)
    expect(result.data.occurredAt).toBe(occurredAt)
    expect(result.data).not.toHaveProperty('distanceMetres')
  })

  it.each([
    ['跑步', { activity: 'Running' }],
    ['跑步45min 5km', { activity: 'Running' }],
    ['跑步1小时90分钟', { activity: 'Running' }],
    ['run 1h75', { activity: 'Running' }],
    ['running 30min today', { activity: 'Running' }],
    ['cycling 45min', { activity: 'cycling', durationSeconds: 2700 }],
    ['45min', { durationSeconds: 2700 }],
    ['runaway 45min', { activity: 'runaway', durationSeconds: 2700 }],
  ])('keeps only safe fields for partial input %s', (input, fields) => {
    expect(parseExerciseText(input, referenceDate)).toEqual({
      kind: 'partial',
      candidate: { occurredAt, source: 'text', ...fields },
    })
  })

  it('does not create a candidate from empty text', () => {
    expect(parseExerciseText('   ', referenceDate)).toEqual({ kind: 'empty' })
  })
})
