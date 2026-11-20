import { describe, expect, it } from 'vitest'
import { avatarIds, avatarRegistry, resolveAvatar, type AvatarId } from './avatarRegistry'
import { selectAvatarForPage } from './avatarPageSelection'
import type { AppPage } from '../layout/Navigation'

describe('avatar wardrobe registry and page intent', () => {
  it('registers the 13 approved IDs with only the five available appearances', () => {
    expect(avatarIds).toEqual(['eden-default','eden-treasurer','eden-swim','eden-boxing','eden-archivist','eden-reflector','eden-watching','eden-tarot','eden-iching','eden-bazi','eden-astrology','eden-ziwei','eden-ai-explorer'])
    expect(Object.keys(avatarRegistry)).toHaveLength(13)
    for (const id of avatarIds) {
      expect(avatarRegistry[id].id).toBe(id)
      if (id === 'eden-default' || id === 'eden-treasurer' || id === 'eden-archivist' || id === 'eden-reflector' || id === 'eden-watching') expect(avatarRegistry[id].status).toBe('ready')
      else {
        expect(avatarRegistry[id].status).toBe('planned')
        expect('asset' in avatarRegistry[id]).toBe(false)
        expect(resolveAvatar(id).id).toBe('eden-default')
      }
    }
    expect(resolveAvatar('unavailable-id' as AvatarId).id).toBe('eden-default')
  })
  it('keeps Today original and selects only the static abacus prototype on Expenses', () => {
    expect(selectAvatarForPage('today')).toBe('eden-default')
    expect(selectAvatarForPage('expenses')).toBe('eden-treasurer')
    const treasurer = resolveAvatar('eden-treasurer')
    expect(treasurer.kind).toBe('static-image')
    expect(treasurer.blink).toBe(false)
    expect(treasurer.capturePerch).toBe(false)
  })
  it('selects the static Archivist only on Records', () => {
    expect(selectAvatarForPage('records')).toBe('eden-archivist')
    expect(resolveAvatar('eden-archivist')).toMatchObject({ kind: 'static-image', prototype: '4B-static', blink: false, capturePerch: false })
  })
  it('selects the native right-facing static Reflector on Review only', () => {
    expect(selectAvatarForPage('review')).toBe('eden-reflector')
    expect(resolveAvatar('eden-reflector')).toMatchObject({ kind: 'static-image', prototype: '4B-static', nativeFacing: 'right', blink: false, capturePerch: false })
    expect(resolveAvatar('eden-default').nativeFacing).toBe('left')
  })
  it('selects static prone Watching on Anime without granting a Capture perch', () => {
    expect(selectAvatarForPage('anime')).toBe('eden-watching')
    expect(resolveAvatar('eden-watching')).toMatchObject({ kind: 'static-image', prototype: '4B-static', posture: 'prone', blink: false, capturePerch: false })
  })
  it.each<AppPage>(['exercise','cosmos'])('keeps %s on the original until its assets are approved', (page) => {
    expect(selectAvatarForPage(page)).toBe('eden-default')
  })
  it('excludes About from the global wardrobe', () => { expect(selectAvatarForPage('about')).toBeNull() })
})
