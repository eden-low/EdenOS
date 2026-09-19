import { useContext } from 'react'
import { AnimeProgressContext, type AnimeProgressContextValue } from './animeProgressContextDefinition'

export function useAnimeProgress(): AnimeProgressContextValue {
  const value = useContext(AnimeProgressContext)
  if (!value) throw new Error('useAnimeProgress must be used within AnimeProgressProvider')
  return value
}
