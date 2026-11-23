import { useContext, useMemo, type ReactNode } from 'react'
import { CosmosSelectionContext, createCosmosSelection } from './cosmosSelection'

export function CosmosSelectionProvider({ active, children }: { active: boolean; children: ReactNode }) {
  // A fresh visit starts Tarot before either consumer renders. Changing a tab
  // never changes this store identity or remounts the page/business state.
  const scope = useMemo(() => ({ active, selection: createCosmosSelection() }), [active])
  return <CosmosSelectionContext.Provider value={scope.selection}>{children}</CosmosSelectionContext.Provider>
}

// Preserve standalone CosmosPage usage in tests/embeds without creating a second
// competing store when the global avatar scope already owns the selection.
export function CosmosSelectionBoundary({ children }: { children: ReactNode }) {
  const inherited = useContext(CosmosSelectionContext)
  return inherited ? children : <CosmosSelectionProvider active>{children}</CosmosSelectionProvider>
}
