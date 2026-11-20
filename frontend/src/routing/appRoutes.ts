import type { AppPage } from '../components/layout/Navigation'

const pagePaths: Record<AppPage, string> = {
  today: '/',
  expenses: '/expenses',
  exercise: '/exercise',
  records: '/records',
  review: '/weekly-review',
  anime: '/anime',
  cosmos: '/cosmos',
  about: '/about',
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
  const pathPage = pathPages.get(normalizePath(location.pathname))
  // Canonical deep links win over a leftover legacy fragment (e.g. /expenses#/).
  if (pathPage && pathPage !== 'today') return pathPage
  const hashPath = location.hash.replace(/^#/, '')
  if (hashPath) {
    const hashPage = pathPages.get(normalizePath(hashPath))
    if (hashPage) return hashPage
  }
  return pathPage ?? 'today'
}

const appRouteChange = 'edenos:app-route-change'
export function subscribeAppRoute(listener: () => void): () => void {
  const events = ['popstate', 'hashchange', 'pageshow', appRouteChange]
  events.forEach((event) => window.addEventListener(event, listener))
  return () => events.forEach((event) => window.removeEventListener(event, listener))
}

export function pushAppUrl(url: string, history: Pick<History, 'pushState'> = window.history): void {
  history.pushState(null, '', url)
  // pushState emits no native history event. Notify the same URL-backed store
  // used by back/forward, hash navigation and restored browser documents.
  if (history === window.history) window.dispatchEvent(new Event(appRouteChange))
}

export function pushAppPage(page: AppPage, history: Pick<History, 'pushState'> = window.history): void {
  pushAppUrl(pagePaths[page], history)
}
