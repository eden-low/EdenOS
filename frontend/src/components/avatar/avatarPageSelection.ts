import type { AppPage } from '../layout/Navigation'
import type { AvatarId } from './avatarRegistry'
import type { ExerciseAvatarId } from './exerciseAvatarEntry'

// Page intent only: no financial records, save events, randomness or user data.
const pageAvatars: Readonly<Record<AppPage, AvatarId | null>> = {
  today: 'eden-default', expenses: 'eden-treasurer', exercise: 'eden-swim',
  records: 'eden-archivist', review: 'eden-reflector', anime: 'eden-watching',
  cosmos: 'eden-default', about: null,
}
export function selectAvatarForPage(page: AppPage, exerciseForm: ExerciseAvatarId = 'eden-swim'): AvatarId | null {
  return page === 'exercise' ? exerciseForm : pageAvatars[page]
}
