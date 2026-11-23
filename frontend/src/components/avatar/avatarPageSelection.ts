import type { AppPage } from '../layout/Navigation'
import type { AvatarId } from './avatarRegistry'
import type { ExerciseAvatarId } from './exerciseAvatarEntry'
import type { CosmosExperience } from '../../cosmos/cosmosSelection'

// Page intent only: no financial records, save events, randomness or user data.
const pageAvatars: Readonly<Record<AppPage, AvatarId | null>> = {
  today: 'eden-default', expenses: 'eden-treasurer', exercise: 'eden-swim',
  records: 'eden-archivist', review: 'eden-reflector', anime: 'eden-watching',
  cosmos: 'eden-tarot', about: null,
}
const cosmosAvatars: Readonly<Record<CosmosExperience, AvatarId>> = {
  tarot: 'eden-tarot', iching: 'eden-iching', bazi: 'eden-bazi',
  astrology: 'eden-astrology', ziwei: 'eden-ziwei', ai: 'eden-ai-explorer',
}
export function selectAvatarForPage(page: AppPage, exerciseForm: ExerciseAvatarId = 'eden-swim', cosmosExperience: CosmosExperience = 'tarot'): AvatarId | null {
  if (page === 'exercise') return exerciseForm
  return page === 'cosmos' ? cosmosAvatars[cosmosExperience] ?? 'eden-default' : pageAvatars[page]
}
