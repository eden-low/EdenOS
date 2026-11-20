import type { AppPage } from '../layout/Navigation'
import type { AvatarId } from './avatarRegistry'

// Page intent only: no financial records, save events, randomness or user data.
const pageAvatars: Readonly<Record<AppPage, AvatarId | null>> = {
  today: 'eden-default', expenses: 'eden-treasurer', exercise: 'eden-default',
  records: 'eden-archivist', review: 'eden-default', anime: 'eden-default',
  cosmos: 'eden-default', about: null,
}
export function selectAvatarForPage(page: AppPage): AvatarId | null { return pageAvatars[page] }
