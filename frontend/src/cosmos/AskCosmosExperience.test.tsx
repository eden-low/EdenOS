import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CosmosAiResponse, CosmosSnapshotMap, TarotSource } from './cosmosAiTypes'

const { requestInterpretation } = vi.hoisted(() => ({ requestInterpretation: vi.fn() }))
vi.mock('../services/cosmosAiService', () => ({
  requestCosmosInterpretation: requestInterpretation,
  CosmosAiError: class extends Error { code: string; constructor(code: string) { super(code); this.code = code } },
}))
import { AskCosmosExperience } from './AskCosmosExperience'
import { CosmosAiError } from '../services/cosmosAiService'

const tarot: TarotSource = {
  system: 'tarot', completeness: 'exact', conventions: ['Synthetic convention'], uncertainty: [],
  facts: { spread: 'single', cards: [{ position: '单张牌', deckPosition: 4, cardId: 'major-00', name: '测试牌', englishName: 'Test Card', orientation: 'upright' }] },
}
const response: CosmosAiResponse = {
  overallReflection: '这是整体反思。', observations: [{ source: 'tarot', title: '牌面观察', reflection: '这是来源明确的观察。' }],
  alternatives: ['也可以换一个角度理解。'], reflectiveQuestions: ['你在意什么？', '什么可以验证？', '下一小步是什么？'], limitations: '这是传统象征反思，不是预测。',
}

beforeEach(() => requestInterpretation.mockReset().mockResolvedValue(response))

describe('Ask Cosmos experience', () => {
  it('shows all five availability states and routes users to missing readings', () => {
    const open = vi.fn()
    render(<AskCosmosExperience snapshots={{ tarot }} onOpenSystem={open} />)
    expect(screen.getByText('完整结果 · 可选择')).toBeTruthy()
    expect(screen.getAllByText('尚无本地结果')).toHaveLength(4)
    fireEvent.click(screen.getAllByRole('button', { name: '前往生成' })[0])
    expect(open).toHaveBeenCalledWith('iching')
  })

  it('requires preview consent, prevents duplicate generation, renders, and clears a result', async () => {
    let resolve!: (value: CosmosAiResponse) => void
    requestInterpretation.mockReturnValue(new Promise((done) => { resolve = done }))
    render(<AskCosmosExperience snapshots={{ tarot }} onOpenSystem={vi.fn()} />)
    fireEvent.click(screen.getByRole('radio', { name: /塔罗/ }))
    expect(screen.getByText(/单张牌：测试牌/)).toBeTruthy()
    const generate = screen.getByRole('button', { name: '开始 Gemini 深度解读' })
    expect((generate as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: /我确认本次发送/ }))
    fireEvent.click(generate)
    expect(requestInterpretation).toHaveBeenCalledOnce()
    expect((screen.getByRole('button', { name: /Gemini 正在解读/ }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /Gemini 正在解读/ }))
    expect(requestInterpretation).toHaveBeenCalledOnce()
    resolve(response)
    expect(await screen.findByText('这是整体反思。')).toBeTruthy()
    expect(screen.getByText('给自己的三个问题')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '清除结果' }))
    expect(screen.queryByText('这是整体反思。')).toBeNull()
  })

  it('supports dream reflection without natal data and sends no chart sources', async () => {
    const dreamResponse = { ...response, observations: [{ source: 'dream' as const, title: '门', reflection: '门可能象征过渡。' }],
      dreamThemes: [{ image: '门', associations: ['过渡'], alternatives: ['边界'] }] }
    requestInterpretation.mockResolvedValueOnce(dreamResponse)
    render(<AskCosmosExperience snapshots={{}} onOpenSystem={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /梦境解读/ }))
    fireEvent.change(screen.getByRole('textbox', { name: /梦境内容/ }), { target: { value: '梦见不断寻找一扇门。' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /我确认本次发送/ }))
    fireEvent.click(screen.getByRole('button', { name: '开始 Gemini 深度解读' }))
    await waitFor(() => expect(requestInterpretation).toHaveBeenCalledOnce())
    expect(requestInterpretation.mock.calls[0][0]).toMatchObject({ mode: 'dream', sources: [], dreamText: '梦见不断寻找一扇门。' })
    expect(await screen.findByText('门可能象征过渡。')).toBeTruthy()
  })

  it.each([
    ['gemini-request-prerequisite', 'Gemini 无法接受本次请求，或服务前置条件未满足。请暂停重试并检查服务器配置。'],
    ['gemini-authentication', 'Gemini API 凭据验证失败。请检查服务器端密钥配置后再手动重试。'],
    ['gemini-billing', 'Gemini 计费或预付额度不可用。请检查 Google AI Studio 的计费状态后再手动重试。'],
    ['gemini-permission', 'Gemini API 拒绝此服务器凭据访问。请检查密钥权限或项目访问状态。'],
    ['gemini-model-unavailable', '当前 Gemini 模型或资源不可用。请检查服务器端模型访问状态。'],
  ] as const)('shows the safe upstream category %s without provider details', async (code, message) => {
    requestInterpretation.mockRejectedValueOnce(new CosmosAiError(code))
    render(<AskCosmosExperience snapshots={{}} onOpenSystem={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /梦境解读/ }))
    fireEvent.change(screen.getByRole('textbox', { name: /梦境内容/ }), { target: { value: '虚构梦境内容。' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /我确认本次发送/ }))
    fireEvent.click(screen.getByRole('button', { name: '开始 Gemini 深度解读' }))
    expect(await screen.findByText(message)).toBeTruthy()
    expect(document.body.textContent).not.toContain('private provider')
  })

  it('requires explicit confirmation for incompatible cross-system birth inputs', () => {
    const snapshots: CosmosSnapshotMap = {
      bazi: { system: 'bazi', completeness: 'exact', conventions: ['BaZi'], uncertainty: [], subject: { date: '2000-01-01', timeKnown: true, time: '08:00', timeZone: 'Asia/Kuala_Lumpur' }, facts: {
        pillars: { year: '甲子', month: '乙丑', day: '丙寅', hour: '丁卯' }, dayMaster: { character: '丙', element: 'fire', yinYang: 'yang' },
        visibleElements: { wood: 2, fire: 2, earth: 1, metal: 1, water: 2 }, tenGods: [],
      } },
      astrology: { system: 'astrology', completeness: 'partial', conventions: ['Western'], uncertainty: ['time unknown'], subject: { date: '2001-01-01', timeKnown: false, time: null, timeZone: 'Europe/London' }, facts: {
        chartKind: 'date-only', placements: Array.from({ length: 10 }, (_, index) => ({ planet: `p${index}`, sign: 'aries', possibleSigns: ['aries'], degree: null, house: null })), ascendant: null, midheaven: null, aspects: [],
      } },
    }
    render(<AskCosmosExperience snapshots={snapshots} onOpenSystem={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /综合解读/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /八字/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /占星/ }))
    expect(screen.getByText('出生资料并非已确认完全兼容')).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox', { name: /我确认本次发送/ }))
    expect((screen.getByRole('button', { name: '开始 Gemini 深度解读' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: /出生资料并非已确认完全兼容/ }))
    expect((screen.getByRole('button', { name: '开始 Gemini 深度解读' }) as HTMLButtonElement).disabled).toBe(false)
  })
})
