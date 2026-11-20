import { describe, expect, it } from 'vitest'
import { avatarIds, avatarRegistry, resolveAvatar, type AvatarId } from './avatarRegistry'
import { selectAvatarForPage } from './avatarPageSelection'
import type { AppPage } from '../layout/Navigation'

describe('avatar wardrobe registry and page intent', () => {
  it('registers all 13 approved IDs with real available artwork', () => {
    expect(avatarIds).toEqual(['eden-default','eden-treasurer','eden-swim','eden-boxing','eden-archivist','eden-reflector','eden-watching','eden-tarot','eden-iching','eden-bazi','eden-astrology','eden-ziwei','eden-ai-explorer'])
    expect(Object.keys(avatarRegistry)).toHaveLength(13)
    for (const id of avatarIds) {
      expect(avatarRegistry[id].id).toBe(id)
      expect(avatarRegistry[id].status).toBe('ready')
      expect(resolveAvatar(id).id).toBe(id)
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
  it('selects the Exercise entry result without affecting any other page mapping', () => {
    expect(selectAvatarForPage('exercise')).toBe('eden-swim')
    expect(selectAvatarForPage('exercise', 'eden-boxing')).toBe('eden-boxing')
    for (const page of ['today', 'expenses', 'records', 'review', 'anime', 'about'] as AppPage[])
      expect(selectAvatarForPage(page, 'eden-boxing')).toBe(selectAvatarForPage(page))
  })
  it.each([
    ['tarot', 'eden-tarot'], ['iching', 'eden-iching'], ['bazi', 'eden-bazi'],
    ['astrology', 'eden-astrology'], ['ziwei', 'eden-ziwei'], ['ai', 'eden-ai-explorer'],
  ] as const)('maps Cosmos %s directly to %s', (system, id) => {
    expect(selectAvatarForPage('cosmos', 'eden-boxing', system)).toBe(id)
    expect(resolveAvatar(id)).toMatchObject({ prototype: '4D-static', blink: false, capturePerch: false })
    expect(selectAvatarForPage('today', 'eden-boxing', system)).toBe('eden-default')
  })
  it('defaults Cosmos to Tarot', () => { expect(selectAvatarForPage('cosmos')).toBe('eden-tarot') })
  it('excludes About from the global wardrobe', () => { expect(selectAvatarForPage('about')).toBeNull() })
})
