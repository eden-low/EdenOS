import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AvatarAppearance } from './AvatarAppearance'
import { avatarIds, avatarRegistry } from './avatarRegistry'

class LoaderImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  decode = vi.fn(async (): Promise<void> => undefined)
  constructor() { loaders.push(this) }
}
let loaders: LoaderImage[]
const idle = { perched: false, attentive: false, still: false }
const appearance = () => document.querySelector('.eden-avatar-appearance')!
async function loaded() { await act(async () => { loaders.at(-1)!.onload!() }) }
beforeEach(() => { loaders = []; vi.stubGlobal('Image', LoaderImage) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe.each([['eden-treasurer', 352, 656], ['eden-archivist', 264, 492]] as const)('wardrobe rendering independent of layout and motion: %s', (avatarId, width, height) => {
  it('preloads/decode-checks the approved image while retaining a safe default', async () => {
    const view = render(<AvatarAppearance avatarId={avatarId} {...idle} />)
    expect(appearance().getAttribute('data-avatar-id')).toBe('eden-default')
    expect(appearance().getAttribute('data-asset-state')).toBe('loading')
    expect(loaders).toHaveLength(1)
    await loaded()
    expect(loaders[0].decode).toHaveBeenCalledOnce()
    expect(appearance().getAttribute('data-avatar-id')).toBe(avatarId)
    expect(appearance().getAttribute('data-avatar-mode')).toBe('static-prototype')
    const image = document.querySelector('img')!
    expect(image.width).toBe(width); expect(image.height).toBe(height)
    expect(image.style.objectPosition).toBe('50% 100%')
    expect(image.alt).toBe(''); expect(image.draggable).toBe(false)
    expect(document.querySelector('.eden-avatar-eyes-closed')).toBeNull()
    view.rerender(<AvatarAppearance avatarId={avatarId} {...idle} still />)
    expect(document.querySelector('img')).toBe(image)
    expect(loaders).toHaveLength(1)
  })
  it('uses the accepted atlas for Today and any unsupported perch', () => {
    const view = render(<AvatarAppearance avatarId="eden-default" {...idle} />)
    expect(loaders).toHaveLength(0)
    expect(document.querySelector('.eden-avatar-art')?.getAttribute('viewBox')).toBe('144 0 256 512')
    view.rerender(<AvatarAppearance avatarId={avatarId} {...idle} perched />)
    expect(appearance().getAttribute('data-avatar-id')).toBe('eden-default')
    expect(document.querySelector('.eden-avatar-art')?.getAttribute('viewBox')).toBe('0 512 512 512')
    expect(loaders).toHaveLength(0)
  })
  it('never attempts to load planned wardrobe resources', () => {
    const view = render(<AvatarAppearance avatarId="eden-default" {...idle} />)
    for (const id of avatarIds.filter((id) => avatarRegistry[id].status === 'planned')) {
      view.rerender(<AvatarAppearance avatarId={id} {...idle} />)
      expect(appearance().getAttribute('data-avatar-id')).toBe('eden-default')
    }
    expect(loaders).toHaveLength(0)
  })
  it.each(['network','decode','display'])('falls back safely on %s failure', async (failure) => {
    render(<AvatarAppearance avatarId={avatarId} {...idle} />)
    if (failure === 'network') act(() => loaders[0].onerror!())
    else if (failure === 'decode') {
      loaders[0].decode.mockRejectedValueOnce(new Error('Invalid image'))
      await loaded()
    } else { await loaded(); fireEvent.error(document.querySelector('img')!) }
    expect(appearance().getAttribute('data-avatar-id')).toBe('eden-default')
    expect(appearance().getAttribute('data-asset-state')).toBe('error')
    expect(document.querySelector('img')).toBeNull()
    expect(document.querySelector('.eden-avatar-art')).toBeTruthy()
  })
  it('cleans pending loads on page change and ignores a stale decode completion', async () => {
    let finish!: () => void
    const view = render(<AvatarAppearance avatarId={avatarId} {...idle} />)
    const image = loaders[0]
    image.decode.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve }))
    act(() => image.onload!())
    view.rerender(<AvatarAppearance avatarId="eden-default" {...idle} />)
    expect(image.onload).toBeNull(); expect(image.onerror).toBeNull()
    await act(async () => finish())
    expect(appearance().getAttribute('data-avatar-id')).toBe('eden-default')
    expect(document.querySelector('img')).toBeNull()
    view.rerender(<AvatarAppearance avatarId={avatarId} {...idle} />)
    expect(loaders).toHaveLength(2)
    await loaded()
    expect(appearance().getAttribute('data-avatar-id')).toBe(avatarId)
    view.unmount()
    expect(loaders[1].onload).toBeNull(); expect(loaders[1].onerror).toBeNull()
    expect(appearance()).toBeNull()
  })
})
