import { describe, expect, it } from 'vitest'
import { avatarTransition, type AvatarEvent, type AvatarState } from './avatarMachine'

describe('Today Avatar state machine', () => {
  it('notices Capture, travels, perches and returns', () => {
    let state: AvatarState = 'idle'
    const observed: AvatarState[] = []
    for (const event of ['open', 'noticed', 'arrived', 'close', 'home'] as AvatarEvent[]) {
      state = avatarTransition(state, event)
      observed.push(state)
    }
    expect(observed).toEqual(['attentive', 'moveToSheet', 'perched', 'returning', 'idle'])
  })
  it('handles close during travel, rapid reopen and stale completions', () => {
    expect(avatarTransition('attentive', 'close')).toBe('returning')
    expect(avatarTransition('moveToSheet', 'close')).toBe('returning')
    expect(avatarTransition('returning', 'open')).toBe('attentive')
    expect(avatarTransition('attentive', 'home')).toBe('attentive')
    expect(avatarTransition('returning', 'arrived')).toBe('returning')
    expect(avatarTransition('idle', 'close')).toBe('idle')
  })
})
