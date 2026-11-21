import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AboutWardrobeGallery } from './AboutWardrobeGallery'
import { wardrobeLooks, wardrobeName, wardrobeNumber } from './aboutWardrobeContent'
import { avatarIds, resolveAvatar } from '../components/avatar/avatarRegistry'
import { AboutPage } from '../pages/AboutPage'
import { PrivacyLockContext, unlockedPrivacyLock } from '../privacy/privacyLockContext'
import { CosmosSelectionProvider } from '../cosmos/CosmosSelectionProvider'
import { useCosmosSelection } from '../cosmos/cosmosSelection'

class ImageLoader {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  decode = vi.fn(async (): Promise<void> => undefined)
  constructor() { loaders.push(this) }
}
let loaders: ImageLoader[]
const preview = () => document.querySelector<HTMLElement>('.about-wardrobe-preview')!
const choose = (id: string) => fireEvent.click(document.querySelector(`[data-wardrobe-choice="${id}"]`)!)
const next = () => fireEvent.click(screen.getByRole('button', { name: '查看下一套服装' }))
async function loaded() { await act(async () => { loaders.at(-1)!.onload!() }) }
beforeEach(() => {
  loaders = []
  vi.stubGlobal('Image', ImageLoader)
  history.replaceState(null, '', '/about')
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('independent About wardrobe', () => {
  it('starts Original, reuses the open standing atlas frame, and exposes actual buttons/live selection', () => {
    render(<AboutWardrobeGallery />)
    expect(preview().dataset.previewAvatar).toBe('eden-default')
    expect(loaders).toHaveLength(0)
    expect(document.querySelector('.eden-avatar-art')?.getAttribute('viewBox')).toBe('144 0 256 512')
    expect(document.querySelector('.eden-avatar-art')?.getAttribute('data-still')).toBe('true')
    expect(screen.getByRole('button', { name: '查看下一套服装' }).tagName).toBe('BUTTON')
    expect(screen.getByRole('button', { name: '01 Original Eden · 日常版' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('01 / 13，Original Eden · 日常版').getAttribute('aria-live')).toBe('polite')
    expect(document.querySelector('.eden-avatar')).toBeNull()
    expect(screen.getAllByRole('heading')).toHaveLength(2) // sizing copies stay out of the accessibility tree
  })
  it('lists exactly the approved 13 names in display order, each resolving to real art', () => {
    expect(wardrobeLooks.map(item => item.id)).toEqual(['eden-default','eden-treasurer','eden-archivist','eden-reflector','eden-watching','eden-swim','eden-boxing','eden-tarot','eden-iching','eden-bazi','eden-astrology','eden-ziwei','eden-ai-explorer'])
    expect(new Set(wardrobeLooks.map(item => item.id))).toEqual(new Set(avatarIds))
    render(<AboutWardrobeGallery />)
    for (const [index, look] of wardrobeLooks.entries()) {
      expect(screen.getByRole('button', { name: `${String(index + 1).padStart(2,'0')} ${wardrobeName(look)}` })).toBeTruthy()
      expect(resolveAvatar(look.id).id).toBe(look.id)
    }
  })
  it('cycles by clicking the character through all 13, then wraps to the original', async () => {
    render(<AboutWardrobeGallery />)
    const button = screen.getByRole('button', { name: '查看下一套服装' })
    button.focus()
    for (let index = 1; index <= wardrobeLooks.length; index++) {
      next()
      const look = wardrobeLooks[index % wardrobeLooks.length]
      if (look.id !== 'eden-default') await loaded()
      expect(preview().dataset.previewAvatar).toBe(look.id)
      expect(document.activeElement).toBe(button)
      expect(screen.getByText(`${wardrobeNumber(index % wardrobeLooks.length)}，${wardrobeName(look)}`)).toBeTruthy()
    }
  })
  it('wraps previous/next and direct selection; a selected card never advances or reloads', async () => {
    render(<AboutWardrobeGallery />)
    fireEvent.click(screen.getByRole('button', { name: '上一套' })); await loaded()
    expect(preview().dataset.previewAvatar).toBe('eden-ai-explorer')
    fireEvent.click(screen.getByRole('button', { name: '下一套' }))
    expect(preview().dataset.previewAvatar).toBe('eden-default')
    choose('eden-reflector'); await loaded()
    const image = document.querySelector('.about-wardrobe-art img'), count = loaders.length
    choose('eden-reflector')
    expect(document.querySelector('.about-wardrobe-art img')).toBe(image)
    expect(loaders).toHaveLength(count)
    expect(document.querySelector('.about-wardrobe-art [transform]')).toBeNull()
  })
  it('uses the registry URL and a complete landscape window for Watching, without stretching', async () => {
    render(<AboutWardrobeGallery />); choose('eden-watching'); await loaded()
    expect(document.querySelector('.about-wardrobe-art > svg')?.getAttribute('viewBox')).toBe('0 373 352 283')
    const visual = resolveAvatar('eden-watching')
    if (visual.kind !== 'static-image') throw new Error('Watching needs its approved static art')
    expect(document.querySelector('.about-wardrobe-art image')?.getAttribute('href')).toBe(visual.asset.src)
    expect(document.querySelector('.about-wardrobe-art > svg')?.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet')
  })
  it.each(['network','decode','display'])('keeps selection usable on %s failure, falls back and retries online', async failure => {
    render(<AboutWardrobeGallery />); choose('eden-tarot')
    if (failure === 'decode') { loaders[0].decode.mockRejectedValueOnce(new Error('Synthetic decode')); await loaded() }
    else if (failure === 'display') { await loaded(); fireEvent.error(document.querySelector('.about-wardrobe-art img')!) }
    else act(() => loaders[0].onerror!())
    expect(preview().dataset.assetState).toBe('error')
    expect(preview().dataset.previewAvatar).toBe('eden-default')
    expect(screen.getByRole('button', { name: '08 Tarot Eden · 星辰占卜师' }).getAttribute('aria-pressed')).toBe('true')
    expect(document.querySelector('.about-wardrobe-status-message')?.textContent).toContain('这套服装暂时没加载好')
    act(() => window.dispatchEvent(new Event('online'))); await loaded()
    expect(preview().dataset.previewAvatar).toBe('eden-tarot')
    choose('eden-swim'); await loaded()
    expect(preview().dataset.previewAvatar).toBe('eden-swim')
  })
  it.each(['resolve','reject'])('ignores stale %s and clears pending callbacks on rapid selection/unmount', async outcome => {
    const disconnected = vi.spyOn(MutationObserver.prototype, 'disconnect')
    const removed = vi.spyOn(document, 'removeEventListener')
    let finish!: () => void
    const view = render(<StrictMode><AboutWardrobeGallery /></StrictMode>)
    choose('eden-tarot'); const old = loaders.at(-1)!
    old.decode.mockReturnValueOnce(new Promise<void>((resolve, reject) => { finish = outcome === 'resolve' ? resolve : () => reject(new Error('Obsolete decode')) }))
    act(() => old.onload!())
    choose('eden-ai-explorer'); await loaded()
    expect(old.onload).toBeNull(); expect(old.onerror).toBeNull()
    await act(async () => finish())
    expect(preview().dataset.previewAvatar).toBe('eden-ai-explorer')
    choose('eden-bazi'); act(() => loaders.at(-1)!.onerror!())
    const count = loaders.length
    view.unmount(); act(() => window.dispatchEvent(new Event('online')))
    expect(disconnected.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(removed).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(loaders).toHaveLength(count)
    expect(loaders.at(-1)!.onload).toBeNull(); expect(loaders.at(-1)!.onerror).toBeNull()
  })
  it('reports a missing original atlas, retries it after reconnect, and keeps other choices usable', () => {
    render(<AboutWardrobeGallery />)
    fireEvent.error(document.querySelector('.about-wardrobe-art image')!)
    expect(screen.getByText(/日常版图片暂时未能加载/)).toBeTruthy()
    act(() => window.dispatchEvent(new Event('online')))
    expect(preview().dataset.assetState).toBe('loading')
    fireEvent.load(document.querySelector('.about-wardrobe-art image')!)
    expect(preview().dataset.assetState).toBe('ready')
    next(); expect(preview().dataset.selectedAvatar).toBe('eden-treasurer')
  })
  it('blocks synchronous behind-modal clicks, then preserves selection and restores interaction', async () => {
    render(<AboutWardrobeGallery />)
    const modal = document.createElement('div'); modal.setAttribute('role','dialog'); modal.dataset.state='open'
    act(() => { document.body.append(modal); next() })
    expect(preview().dataset.selectedAvatar).toBe('eden-default')
    await act(async () => undefined)
    expect(document.querySelector('fieldset')?.disabled).toBe(true)
    expect(document.querySelector('fieldset')?.hasAttribute('inert')).toBe(true)
    act(() => modal.remove()); await act(async () => undefined)
    next(); await loaded()
    expect(preview().dataset.previewAvatar).toBe('eden-treasurer')
  })
  it('does not depend on Finance Lock or change Cosmos state / Exercise session history', async () => {
    function CosmosProbe() { const [system, set] = useCosmosSelection(); return <button onClick={() => set('ziwei')}>{system}</button> }
    const tree = (locked: boolean) => <PrivacyLockContext.Provider value={{...unlockedPrivacyLock,enabled:true,locked}}><CosmosSelectionProvider active><CosmosProbe /><AboutWardrobeGallery /></CosmosSelectionProvider></PrivacyLockContext.Provider>
    const writes = vi.spyOn(Storage.prototype,'setItem')
    const view = render(tree(true)); fireEvent.click(screen.getByRole('button',{name:'tarot'}))
    choose('eden-boxing'); await loaded()
    view.rerender(tree(false))
    expect(preview().dataset.previewAvatar).toBe('eden-boxing')
    expect(screen.getByRole('button',{name:'ziwei'})).toBeTruthy()
    expect(writes).not.toHaveBeenCalled()
    view.unmount(); render(<AboutWardrobeGallery />)
    expect(preview().dataset.previewAvatar).toBe('eden-default')
  })
  it('keeps the existing three-gesture laboratory independent', async () => {
    vi.useFakeTimers()
    render(<AboutPage />)
    fireEvent.load(document.querySelector('[data-avatar-art="wave"]')!)
    fireEvent.click(screen.getByRole('button',{name:'挥手'}))
    const stage = document.querySelector('.about-avatar-stage')!, cell = stage.getAttribute('data-cell')
    choose('eden-ziwei')
    expect(stage.getAttribute('data-action')).toBe('wave'); expect(stage.getAttribute('data-cell')).toBe(cell)
    fireEvent.click(screen.getByRole('button',{name:'微笑'}))
    await act(async () => undefined)
    expect(preview().dataset.selectedAvatar).toBe('eden-ziwei')
    expect(document.querySelector('.eden-avatar')).toBeNull()
  })
})
