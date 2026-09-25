export const dashboardSections = ['finance', 'exercise', 'anime', 'review', 'records', 'calendar'] as const
export type DashboardSection = (typeof dashboardSections)[number]

export interface DashboardPreferences {
  order: DashboardSection[]
  hidden: DashboardSection[]
}

export const defaultDashboardPreferences: DashboardPreferences = { order: [...dashboardSections], hidden: [] }

function storageKey(uid: string): string { return `edenos.dashboard.v1:${uid}` }
function isSection(value: unknown): value is DashboardSection { return typeof value === 'string' && dashboardSections.some((section) => section === value) }

export function readDashboardPreferences(storage: Pick<Storage, 'getItem'>, uid: string): DashboardPreferences {
  try {
    const raw = storage.getItem(storageKey(uid))
    if (!raw) return { ...defaultDashboardPreferences, order: [...defaultDashboardPreferences.order], hidden: [] }
    const value = JSON.parse(raw) as { order?: unknown; hidden?: unknown }
    const savedOrder = Array.isArray(value.order) ? value.order.filter(isSection) : []
    const order = [...new Set([...savedOrder, ...dashboardSections])]
    const hidden = Array.isArray(value.hidden) ? [...new Set(value.hidden.filter(isSection))] : []
    return { order, hidden }
  } catch { return { ...defaultDashboardPreferences, order: [...defaultDashboardPreferences.order], hidden: [] } }
}

export function writeDashboardPreferences(storage: Pick<Storage, 'setItem'>, uid: string, preferences: DashboardPreferences): void {
  storage.setItem(storageKey(uid), JSON.stringify(preferences))
}

export function resetDashboardPreferences(storage: Pick<Storage, 'removeItem'>, uid: string): DashboardPreferences {
  storage.removeItem(storageKey(uid))
  return { ...defaultDashboardPreferences, order: [...defaultDashboardPreferences.order], hidden: [] }
}
