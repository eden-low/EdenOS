export type AvatarState = 'idle' | 'attentive' | 'moveToSheet' | 'perched' | 'returning'
export type AvatarEvent = 'open' | 'close' | 'noticed' | 'arrived' | 'home'

// Reopening interrupts the return; stale animation completions cannot change a new journey.
export function avatarTransition(state: AvatarState, event: AvatarEvent): AvatarState {
  if (event === 'open') return state === 'idle' || state === 'returning' ? 'attentive' : state
  if (event === 'close') return state === 'idle' ? 'idle' : 'returning'
  if (event === 'noticed' && state === 'attentive') return 'moveToSheet'
  if (event === 'arrived' && state === 'moveToSheet') return 'perched'
  if (event === 'home' && state === 'returning') return 'idle'
  return state
}
