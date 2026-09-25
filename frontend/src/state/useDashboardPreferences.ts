import { useState } from 'react'
import { defaultDashboardPreferences, readDashboardPreferences, resetDashboardPreferences, writeDashboardPreferences, type DashboardPreferences, type DashboardSection } from '../domain/dashboardPreferences'
import { useFirebaseAuth } from './useFirebaseAuth'

export function useDashboardPreferences() {
  const { uid } = useFirebaseAuth()
  const [preferences, setPreferences] = useState<DashboardPreferences>(() => readDashboardPreferences(localStorage, uid))
  function update(next: DashboardPreferences) { writeDashboardPreferences(localStorage, uid, next); setPreferences(next) }
  return {
    preferences,
    move(section: DashboardSection, direction: -1 | 1) {
      const index = preferences.order.indexOf(section); const target = index + direction
      if (index < 0 || target < 0 || target >= preferences.order.length) return
      const order = [...preferences.order]; [order[index], order[target]] = [order[target], order[index]]
      update({ ...preferences, order })
    },
    setVisible(section: DashboardSection, visible: boolean) {
      update({ ...preferences, hidden: visible ? preferences.hidden.filter((item) => item !== section) : [...new Set([...preferences.hidden, section])] })
    },
    reset() { setPreferences(resetDashboardPreferences(localStorage, uid)) },
    defaults: defaultDashboardPreferences,
  }
}
