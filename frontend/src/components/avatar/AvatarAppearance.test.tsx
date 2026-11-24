import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import { AvatarAppearance } from './AvatarAppearance'
import { resolveAvatar, type AvatarId } from './avatarRegistry'

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
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe.each([['eden-treasurer', 352, 656], ['eden-archivist', 264, 492], ['eden-reflector', 264, 492], ['eden-watching', 352, 656], ['eden-swim', 352, 656], ['eden-boxing', 352, 656], ['eden-tarot', 352, 656], ['eden-iching', 352, 656], ['eden-bazi', 352, 656], ['eden-astrology', 352, 656], ['eden-ziwei', 352, 656], ['eden-ai-explorer', 352, 656]] as const)('wardrobe rendering independent of layout and motion: %s', (avatarId, width, height) => {
  it('preloads/decode-checks the approved image while retaining a safe default', async () => {
    const view = render(<AvatarAppearance avatarId={avatarId} {...idle} />)
    expect(appearance().getAttribute('data-avatar-id')).toBe('eden-default')
    expect(appearance().getAttribute('data-asset-state')).toBe('loading')
    expect(loaders).toHaveLength(1)
    await loaded()
    expect(loaders[0].decode).toHaveBeenCalledOnce()
    expect(appearance().getAttribute('data-avatar-id')).toBe(avatarId)
    expect(appearance().getAttribute('data-avatar-mode')).toBe('static-prototype')
    expect(appearance().getAttribute('data-avatar-posture')).toBe(avatarId === 'eden-watching' ? 'prone' : null)
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
  it('orients the actual material inward without changing frame, node or loading lifecycle', async () => {
    const view = render(<AvatarAppearance avatarId={avatarId} {...idle} faceInward />)
    const facing = () => document.querySelector('.eden-avatar-facing')!
    expect(facing().hasAttribute('data-mirrored')).toBe(true) // loading default
    await loaded()
    const image = document.querySelector('img')!
    expect(facing().hasAttribute('data-mirrored')).toBe(resolveAvatar(avatarId).nativeFacing === 'left')
    view.rerender(<AvatarAppearance avatarId={avatarId} {...idle} faceInward still />)
    expect(document.querySelector('img')).toBe(image)
    expect(loaders).toHaveLength(1)
    fireEvent.error(image)
    expect(appearance().getAttribute('data-avatar-id')).toBe('eden-default')
    expect(facing().hasAttribute('data-mirrored')).toBe(true)
    view.rerender(<AvatarAppearance avatarId={avatarId} {...idle} />)
    expect(facing().hasAttribute('data-mirrored')).toBe(false)
  })
  it('retries only the selected failed resource on reconnect and cleans its old loader', async () => {
    const view = render(<AvatarAppearance avatarId={avatarId} {...idle} />)
    act(() => loaders[0].onerror!())
    act(() => window.dispatchEvent(new Event('online')))
    expect(loaders).toHaveLength(2)
    expect(loaders[0].onload).toBeNull(); expect(loaders[0].onerror).toBeNull()
    expect(appearance().getAttribute('data-avatar-id')).toBe('eden-default')
    await loaded()
    expect(appearance().getAttribute('data-avatar-id')).toBe(avatarId)
    act(() => window.dispatchEvent(new Event('online')))
    expect(loaders).toHaveLength(2)
    view.unmount()
    act(() => window.dispatchEvent(new Event('online')))
    expect(loaders).toHaveLength(2)
  })
  it('cleans the failed-resource online listener and Strict Mode loaders on unmount', () => {
    const add = vi.spyOn(window, 'addEventListener'), remove = vi.spyOn(window, 'removeEventListener')
    const view = render(<StrictMode><AvatarAppearance avatarId={avatarId} {...idle} /></StrictMode>)
    expect(loaders).toHaveLength(2)
    expect(loaders[0].onload).toBeNull(); expect(loaders[0].onerror).toBeNull()
    act(() => loaders[1].onerror!())
    const listener = add.mock.calls.find(([type]) => type === 'online')![1]
    view.unmount()
    expect(remove).toHaveBeenCalledWith('online', listener)
    expect(loaders[1].onload).toBeNull(); expect(loaders[1].onerror).toBeNull()
    act(() => window.dispatchEvent(new Event('online')))
    expect(loaders).toHaveLength(2)
  })
})

it('never invents a loader for an unknown runtime ID', () => {
  render(<AvatarAppearance avatarId={'missing-role' as AvatarId} {...idle} />)
  expect(appearance().getAttribute('data-avatar-id')).toBe('eden-default')
  expect(loaders).toHaveLength(0)
})

it('ignores a late Swim decode after Boxing has already loaded', async () => {
  let finish!: () => void
  const view = render(<AvatarAppearance avatarId="eden-swim" {...idle} />)
  const swim = loaders[0]
  swim.decode.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve }))
  act(() => swim.onload!())
  view.rerender(<AvatarAppearance avatarId="eden-boxing" {...idle} />)
  expect(swim.onload).toBeNull(); expect(swim.onerror).toBeNull()
  await loaded()
  const boxing = document.querySelector('img')!
  expect(appearance().getAttribute('data-avatar-id')).toBe('eden-boxing')
  await act(async () => finish())
  expect(appearance().getAttribute('data-avatar-id')).toBe('eden-boxing')
  expect(document.querySelector('img')).toBe(boxing)
})

it('ignores an old rejected decode after a different Cosmos material is already ready', async () => {
  let reject!: (error: Error) => void
  const view = render(<AvatarAppearance avatarId="eden-tarot" {...idle} />)
  loaders[0].decode.mockReturnValueOnce(new Promise<void>((_, failed) => { reject = failed }))
  act(() => loaders[0].onload!())
  view.rerender(<AvatarAppearance avatarId="eden-ai-explorer" {...idle} />)
  await loaded()
  const current = document.querySelector('img')
  await act(async () => reject(new Error('Late obsolete decode failure')))
  expect(appearance().getAttribute('data-avatar-id')).toBe('eden-ai-explorer')
  expect(appearance().getAttribute('data-asset-state')).toBe('ready')
  expect(document.querySelector('img')).toBe(current)
})
