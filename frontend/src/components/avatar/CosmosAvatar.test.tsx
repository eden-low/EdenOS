import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { CosmosPage } from '../../pages/CosmosPage'
import { EdenAvatarProvider } from './EdenAvatar'
import type { AppPage } from '../layout/Navigation'
import { exerciseAvatarSessionKey } from './exerciseAvatarEntry'
import { requestCosmosInterpretation } from '../../services/cosmosAiService'

vi.mock('../../cosmos/BaZiExperience', () => ({ BaZiExperience: () => <h2>Local BaZi</h2> }))
vi.mock('../../cosmos/AstrologyExperience', () => ({ AstrologyExperience: () => <h2>Local Astrology</h2> }))
vi.mock('../../cosmos/ZiWeiExperience', () => ({ ZiWeiExperience: () => <h2>Local Zi Wei</h2> }))
vi.mock('../../services/cosmosAiService', () => ({ requestCosmosInterpretation: vi.fn(() => { throw new Error('Paid requests forbidden') }), CosmosAiError: class extends Error {} }))

class Loader {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  decode = vi.fn(async (): Promise<void> => undefined)
  constructor() { loaders.push(this) }
}
let loaders: Loader[]
beforeEach(() => {
  loaders = []
  vi.stubGlobal('Image', Loader)
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => setTimeout(() => fn(performance.now()), 16))
  vi.stubGlobal('cancelAnimationFrame', (timer: number) => clearTimeout(timer))
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const visual = () => document.querySelector('.eden-avatar-appearance')!
const tab = (system: string) => document.querySelector<HTMLButtonElement>(`#cosmos-${system}-tab`)!
const choose = (system: string) => fireEvent.click(tab(system))
const loaded = async () => { await act(async () => { loaders.at(-1)!.onload!() }) }
function tree(page: AppPage = 'cosmos') {
  return <EdenAvatarProvider enabled page={page}>{page === 'cosmos' ? <CosmosPage /> : <p>Other page</p>}</EdenAvatarProvider>
}
it('shares all six button selections, arrow/Home/End keys and real Ask Cosmos internal jumps', async () => {
  render(tree())
  expect(tab('tarot').getAttribute('aria-selected')).toBe('true')
  await loaded()
  for (const [system, id] of [['ai', 'eden-ai-explorer'], ['iching', 'eden-iching'], ['ziwei', 'eden-ziwei'], ['bazi', 'eden-bazi'], ['astrology', 'eden-astrology'], ['tarot', 'eden-tarot']]) {
    choose(system); await loaded()
    expect(tab(system).getAttribute('aria-selected')).toBe('true')
    expect(visual().getAttribute('data-avatar-id')).toBe(id)
    const current = document.querySelector('img'), count = loaders.length
    choose(system)
    expect(document.querySelector('img')).toBe(current); expect(loaders).toHaveLength(count)
  }
  fireEvent.keyDown(tab('tarot'), { key: 'End' }); await loaded()
  expect(visual().getAttribute('data-avatar-id')).toBe('eden-ai-explorer')
  fireEvent.keyDown(tab('ai'), { key: 'ArrowLeft' }); await loaded()
  expect(visual().getAttribute('data-avatar-id')).toBe('eden-ziwei')
  fireEvent.keyDown(tab('ziwei'), { key: 'Home' }); await loaded()
  expect(visual().getAttribute('data-avatar-id')).toBe('eden-tarot')
  fireEvent.keyDown(tab('tarot'), { key: 'ArrowRight' }); await loaded()
  expect(visual().getAttribute('data-avatar-id')).toBe('eden-iching')
  for (const [index, id] of ['eden-tarot', 'eden-iching', 'eden-bazi', 'eden-astrology', 'eden-ziwei'].entries()) {
    choose('ai'); await screen.findByRole('heading', { name: 'AI 解读，建立在你的本地结果之上' })
    const button = document.querySelectorAll('.ask-source-grid article')[index].querySelector('button')!
    fireEvent.click(button); await loaded()
    expect(visual().getAttribute('data-avatar-id')).toBe(id)
  }
  expect(requestCosmosInterpretation).not.toHaveBeenCalled()
})

it('retains Tarot inputs/results when images fail, reconnect, or another system is selected', async () => {
  render(tree())
  await loaded()
  fireEvent.click(screen.getByRole('button', { name: '洗牌 / Shuffle' }))
  const input = screen.getByRole<HTMLInputElement>('textbox', { name: /Card number/ })
  fireEvent.change(input, { target: { value: '17' } })
  fireEvent.error(document.querySelector('img')!)
  expect(visual().getAttribute('data-avatar-id')).toBe('eden-default')
  expect(screen.getByRole('textbox', { name: /Card number/ })).toBe(input)
  act(() => window.dispatchEvent(new Event('online')))
  await loaded()
  expect(visual().getAttribute('data-avatar-id')).toBe('eden-tarot')
  expect(input.value).toBe('17')
  fireEvent.click(screen.getByRole('button', { name: '揭示牌面 / Reveal' }))
  const result = document.querySelector('.cosmos-revealed-card')!.textContent
  choose('bazi'); await loaded()
  choose('tarot'); await loaded()
  expect(document.querySelector('.cosmos-revealed-card')!.textContent).toBe(result)
  expect(requestCosmosInterpretation).not.toHaveBeenCalled()
})

it('ignores old pending decodes and resets a fresh visit to the actual Tarot selection', async () => {
  let finish!: () => void
  const view = render(tree()), old = loaders[0]
  old.decode.mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve }))
  act(() => old.onload!())
  for (const system of ['bazi', 'ai', 'iching', 'ziwei']) choose(system)
  expect(old.onload).toBeNull(); expect(old.onerror).toBeNull()
  await loaded()
  await act(async () => finish())
  expect(visual().getAttribute('data-avatar-id')).toBe('eden-ziwei')
  expect(tab('ziwei').getAttribute('aria-selected')).toBe('true')
  view.rerender(tree('today'))
  view.rerender(tree())
  expect(tab('tarot').getAttribute('aria-selected')).toBe('true')
  expect(visual().getAttribute('data-avatar-requested')).toBe('eden-tarot')
  expect(visual().getAttribute('data-avatar-id')).not.toBe('eden-ziwei')
  await loaded()
  expect(visual().getAttribute('data-avatar-id')).toBe('eden-tarot')
})

it('does not consume Exercise entries when Cosmos systems change', async () => {
  window.sessionStorage.removeItem(exerciseAvatarSessionKey)
  const writes = vi.spyOn(Storage.prototype, 'setItem')
  const view = render(tree('exercise'))
  await loaded()
  expect(visual().getAttribute('data-avatar-id')).toBe('eden-swim')
  view.rerender(tree())
  for (const system of ['ai', 'iching', 'ziwei', 'bazi', 'astrology', 'tarot']) choose(system)
  expect(writes.mock.calls.filter(([key]) => key === exerciseAvatarSessionKey)).toHaveLength(1)
  view.rerender(tree('exercise')); await loaded()
  expect(visual().getAttribute('data-avatar-id')).toBe('eden-boxing')
  expect(writes.mock.calls.filter(([key]) => key === exerciseAvatarSessionKey)).toHaveLength(2)
})
