import type { AppPage } from '../components/layout/Navigation'

const pagePaths: Record<AppPage, string> = {
  today: '/',
  expenses: '/expenses',
  exercise: '/exercise',
  records: '/records',
  review: '/weekly-review',
  anime: '/anime',
}

const pathPages = new Map(Object.entries(pagePaths).map(([page, path]) => [path, page as AppPage]))

function normalizePath(value: string): string {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  if (withLeadingSlash === '/') return '/'
  return withLeadingSlash.replace(/\/+$/, '')
}

export function appPagePath(page: AppPage): string {
  return pagePaths[page]
}

export function appPageFromLocation(location: Pick<Location, 'pathname' | 'hash'> = window.location): AppPage {
  const hashPath = location.hash.replace(/^#/, '')
  if (hashPath) {
    const hashPage = pathPages.get(normalizePath(hashPath))
    if (hashPage) return hashPage
  }
  return pathPages.get(normalizePath(location.pathname)) ?? 'today'
}

export function pushAppPage(page: AppPage, history: Pick<History, 'pushState'> = window.history): void {
  history.pushState(null, '', pagePaths[page])
}
