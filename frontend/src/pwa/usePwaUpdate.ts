import { useContext } from 'react'
import { PwaContext, type PwaUpdateState } from './pwaContextDefinition'

export function usePwaUpdate(): PwaUpdateState {
  const update = useContext(PwaContext)
  if (!update) throw new Error('usePwaUpdate must be used within PwaProvider')
  return update
}
