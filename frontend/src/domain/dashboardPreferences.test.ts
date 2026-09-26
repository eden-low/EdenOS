import { describe, expect, it } from 'vitest'
import { defaultDashboardPreferences, readDashboardPreferences, resetDashboardPreferences, writeDashboardPreferences } from './dashboardPreferences'

function memoryStorage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
}

describe('device-local dashboard preferences', () => {
  it('isolates preferences by UID and restores missing sections safely', () => {
    const storage = memoryStorage()
    writeDashboardPreferences(storage, 'alice', { order: ['anime', 'finance', 'exercise', 'review', 'records', 'calendar'], hidden: ['records'] })
    expect(readDashboardPreferences(storage, 'alice')).toMatchObject({ order: ['anime', 'finance', 'exercise', 'review', 'records', 'calendar'], hidden: ['records'] })
    expect(readDashboardPreferences(storage, 'bob')).toEqual(defaultDashboardPreferences)
  })

  it('resets to the strong default layout', () => {
    const storage = memoryStorage()
    writeDashboardPreferences(storage, 'alice', { order: ['calendar', 'finance', 'exercise', 'anime', 'review', 'records'], hidden: ['finance'] })
    expect(resetDashboardPreferences(storage, 'alice')).toEqual(defaultDashboardPreferences)
    expect(readDashboardPreferences(storage, 'alice')).toEqual(defaultDashboardPreferences)
  })
})
