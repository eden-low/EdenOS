import { useEffect, useMemo, useRef, useState } from 'react'
import { Clipboard, RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/button'
import { CosmosAiError, requestCosmosInterpretation } from '../services/cosmosAiService'
import {
  COSMOS_SYSTEM_IDS,
  COSMOS_SYSTEM_LABELS,
  compareBirthSubjects,
  requestSource,
  type CosmosAiMode,
  type CosmosAiRequest,
  type CosmosAiResponse,
  type CosmosSnapshotMap,
  type CosmosSystemId,
} from './cosmosAiTypes'

const MODE_LABELS: Array<{ id: CosmosAiMode; label: string; english: string }> = [
  { id: 'single', label: '单体系解读', english: 'Single system' },
  { id: 'cross', label: '综合解读', english: 'Cross-system' },
  { id: 'dream', label: '梦境解读', english: 'Dream reflection' },
]

const ERROR_MESSAGES: Record<string, string> = {
  auth: '请先登录 EdenOS，再发起解读。', forbidden: '这个账号未获准使用个人 Gemini 端点。',
  invalid: '发送内容未通过安全检查，请检查选择与文字长度。', 'too-large': '发送内容过长，请缩短问题或梦境描述。',
  'not-configured': 'Ask Cosmos 尚未在服务器完成安全配置。', quota: 'Gemini 配额或速率限制已达到，请稍后由你手动重试。',
  'gemini-request-prerequisite': 'Gemini 无法接受本次请求，或服务前置条件未满足。请暂停重试并检查服务器配置。',
  'gemini-authentication': 'Gemini API 凭据验证失败。请检查服务器端密钥配置后再手动重试。',
  'gemini-billing': 'Gemini 计费或预付额度不可用。请检查 Google AI Studio 的计费状态后再手动重试。',
  'gemini-permission': 'Gemini API 拒绝此服务器凭据访问。请检查密钥权限或项目访问状态。',
  'gemini-model-unavailable': '当前 Gemini 模型或资源不可用。请检查服务器端模型访问状态。',
  timeout: 'Gemini 本次响应超时，没有自动重试。', 'malformed-response': 'Gemini 返回的格式无法安全显示，请重新发起一次请求。',
  network: '网络连接失败，请检查连接后手动重试。', provider: 'Gemini 暂时无法完成解读，请稍后手动重试。',
}

function preview(snapshot: NonNullable<CosmosSnapshotMap[CosmosSystemId]>): string {
  if (snapshot.system === 'tarot') return snapshot.facts.cards.map((card) => `${card.position}：${card.name}（${card.orientation === 'upright' ? '正位' : '逆位'}）`).join('；')
  if (snapshot.system === 'iching') return `本卦 ${snapshot.facts.primary.number} ${snapshot.facts.primary.name}；变卦 ${snapshot.facts.relating.number} ${snapshot.facts.relating.name}；动爻 ${snapshot.facts.movingLines.join('、') || '无'}`
  if (snapshot.system === 'bazi') return `四柱 ${Object.values(snapshot.facts.pillars).map((item) => item ?? '未知').join(' / ')}；日主 ${snapshot.facts.dayMaster.character}；${snapshot.completeness === 'exact' ? '完整' : '部分结果'}`
  if (snapshot.system === 'astrology') return `${snapshot.facts.chartKind === 'exact' ? '精确本命盘' : '日期范围星盘'}；${snapshot.facts.placements.map((item) => `${item.planet}:${item.sign ?? item.possibleSigns.join('/')}`).join('，')}`
  return `命宫 ${snapshot.facts.lifePalaceBranch}；身宫 ${snapshot.facts.bodyPalaceBranch}；${snapshot.facts.fiveElementsBureau}；十二宫与十四主星`
}

export function AskCosmosExperience({ snapshots, onOpenSystem }: { snapshots: CosmosSnapshotMap; onOpenSystem: (system: CosmosSystemId) => void }) {
  const [mode, setMode] = useState<CosmosAiMode>('single')
  const [selected, setSelected] = useState<CosmosSystemId[]>([])
  const [question, setQuestion] = useState('')
  const [dreamText, setDreamText] = useState('')
  const [consent, setConsent] = useState(false)
  const [combinationConfirmed, setCombinationConfirmed] = useState(false)
  const [response, setResponse] = useState<CosmosAiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const requestNumber = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const inFlight = useRef(false)
  const chosenSnapshots = useMemo(() => selected.flatMap((id) => snapshots[id] ? [snapshots[id]!] : []), [selected, snapshots])
  const compatibility = useMemo(() => compareBirthSubjects(chosenSnapshots), [chosenSnapshots])
  const requiresCombinationConfirmation = mode === 'cross' && ['incompatible', 'unknown'].includes(compatibility)
  const effectiveQuestion = mode === 'dream' ? '请从文化与象征角度反思这段梦境。' : question.trim() || '请根据所选结果提供整体象征反思。'
  const selectionValid = mode === 'dream' ? dreamText.trim().length > 0 : mode === 'single' ? chosenSnapshots.length === 1 : chosenSnapshots.length >= 2
  const canGenerate = selectionValid && consent && (!requiresCombinationConfirmation || combinationConfirmed) && !loading

  useEffect(() => () => {
    inFlight.current = false
    controller.current?.abort()
  }, [])

  function resetApproval() {
    setConsent(false)
    setCombinationConfirmed(false)
    setError(null)
  }

  function changeMode(next: CosmosAiMode) {
    controller.current?.abort()
    requestNumber.current += 1
    inFlight.current = false
    setMode(next)
    setSelected([])
    setResponse(null)
    setLoading(false)
    resetApproval()
  }

  function toggleSource(system: CosmosSystemId) {
    if (!snapshots[system]) return
    setSelected((current) => mode === 'single' ? [system] : current.includes(system) ? current.filter((item) => item !== system) : [...current, system])
    setResponse(null)
    resetApproval()
  }

  async function generate() {
    if (!canGenerate || inFlight.current) return
    inFlight.current = true
    const currentRequest = ++requestNumber.current
    const abortController = new AbortController()
    controller.current?.abort()
    controller.current = abortController
    const request: CosmosAiRequest = {
      version: 1, promptVersion: 'cosmos-v1', mode, question: effectiveQuestion,
      ...(mode === 'dream' ? { dreamText: dreamText.trim() } : {}),
      sources: mode === 'dream' ? [] : chosenSnapshots.map(requestSource),
      birthCompatibility: mode === 'dream' ? 'not-applicable' : compatibility,
      combinationWarningAcknowledged: !requiresCombinationConfirmation || combinationConfirmed,
      consent: true,
    }
    setLoading(true)
    setError(null)
    setResponse(null)
    try {
      const result = await requestCosmosInterpretation(request, abortController.signal)
      if (currentRequest === requestNumber.current) setResponse(result)
    } catch (cause) {
      if (abortController.signal.aborted) return
      if (currentRequest === requestNumber.current) setError(ERROR_MESSAGES[cause instanceof CosmosAiError ? cause.code : 'provider'])
    } finally {
      if (currentRequest === requestNumber.current) {
        inFlight.current = false
        setLoading(false)
      }
    }
  }

  async function copyResult() {
    if (!response) return
    const text = [response.overallReflection, ...response.observations.map((item) => `${item.title}\n${item.reflection}`),
      ...response.reflectiveQuestions.map((item, index) => `${index + 1}. ${item}`), response.limitations].join('\n\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
  }

  return <div id="cosmos-ai-panel" role="tabpanel" aria-labelledby="cosmos-ai-tab">
    <section className="cosmos-reading ask-cosmos mx-auto mt-7 max-w-5xl rounded-[var(--card-radius)] p-5 sm:mt-9 sm:p-8" aria-labelledby="ask-cosmos-heading">
      <p className="section-label">Ask Cosmos · Gemini interpretation</p>
      <h2 id="ask-cosmos-heading" className="mt-2 text-2xl font-semibold tracking-[-0.03em]">AI 解读，建立在你的本地结果之上</h2>
      <p className="cosmos-context mt-3 text-sm leading-7">所有排盘与抽取仍在设备上完成。只有你检查内容、确认同意并按下生成按钮后，所选衍生结果和文字才会发送给 Google Gemini。</p>

      <div className="ask-mode-grid mt-6" aria-label="Ask Cosmos mode">
        {MODE_LABELS.map((item) => <button type="button" key={item.id} aria-pressed={mode === item.id} onClick={() => changeMode(item.id)}><strong>{item.label}</strong><span>{item.english}</span></button>)}
      </div>

      {mode !== 'dream' && <section className="ask-step mt-7" aria-labelledby="ask-sources-heading">
        <h3 id="ask-sources-heading">选择已有结果</h3>
        <p>{mode === 'single' ? '选择一个已完成的本地结果。' : '选择两个或更多结果，最多可包含全部五个体系。'}</p>
        <div className="ask-source-grid mt-4">
          {COSMOS_SYSTEM_IDS.map((system) => {
            const available = Boolean(snapshots[system])
            const active = selected.includes(system)
            return <article key={system} className={active ? 'is-selected' : ''}>
              <label><input type={mode === 'single' ? 'radio' : 'checkbox'} name={mode === 'single' ? 'cosmos-source' : undefined} checked={active} disabled={!available} onChange={() => toggleSource(system)} /><span><strong>{COSMOS_SYSTEM_LABELS[system]}</strong><small>{available ? `${snapshots[system]!.completeness === 'exact' ? '完整结果' : '部分或不确定结果'} · 可选择` : '尚无本地结果'}</small></span></label>
              {!available && <button type="button" onClick={() => onOpenSystem(system)}>前往生成</button>}
            </article>
          })}
        </div>
      </section>}

      <section className="ask-step mt-7" aria-labelledby="ask-question-heading">
        <h3 id="ask-question-heading">{mode === 'dream' ? '描述梦境' : '你想探索什么？'}</h3>
        <label className="ask-textarea mt-3"><span>{mode === 'dream' ? '梦境内容（必填，最多 4000 字）' : '问题（可选，留空则请求整体反思，最多 1200 字）'}</span><textarea rows={mode === 'dream' ? 7 : 5} maxLength={mode === 'dream' ? 4000 : 1200} value={mode === 'dream' ? dreamText : question} onChange={(event) => { if (mode === 'dream') setDreamText(event.target.value); else setQuestion(event.target.value); setResponse(null); resetApproval() }} placeholder={mode === 'dream' ? '例如：我梦见不断寻找一扇门……' : '例如：这些结果提醒了哪些值得反思的方向？'} /></label>
      </section>

      <section className="ask-review mt-7" aria-labelledby="ask-review-heading">
        <p className="section-label">Review & consent · 发送前检查</p>
        <h3 id="ask-review-heading" className="mt-2">将发送给 Google Gemini 的内容</h3>
        {mode === 'dream' ? <p className="ask-preview mt-4"><strong>梦境文字</strong>{dreamText.trim() || '尚未填写'}</p> : <div className="ask-preview-list mt-4">{chosenSnapshots.length ? chosenSnapshots.map((snapshot) => <article key={snapshot.system}><strong>{COSMOS_SYSTEM_LABELS[snapshot.system]}</strong><p>{preview(snapshot)}</p><small>{snapshot.conventions.join(' ')}</small>{snapshot.uncertainty.map((item) => <em key={item}>{item}</em>)}</article>) : <p>尚未选择可用结果。</p>}</div>}
        <p className="ask-preview mt-4"><strong>{mode === 'dream' ? '请求方式' : '你的问题'}</strong>{mode === 'dream' ? effectiveQuestion : effectiveQuestion}</p>
        {requiresCombinationConfirmation && <label className="ask-warning mt-4"><input type="checkbox" checked={combinationConfirmed} onChange={(event) => setCombinationConfirmed(event.target.checked)} /><span><strong>出生资料并非已确认完全兼容</strong>这些命盘可能使用不同日期、时间、时区，或未知出生时间。我确认仍要并置比较，并理解它们不会被合并成一个“通用命盘”。</span></label>}
        <label className="ask-consent mt-4"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span><strong>我确认本次发送</strong>上述所选衍生结果与文字将发送给 Google Gemini 处理。EdenOS 不保存请求或回复；Google 适用的 API 处理与保留政策仍可能适用。不会发送姓名、邮箱、出生日期、出生时间、城市或坐标。</span></label>
        {error && <p className="cosmos-error mt-4" role="alert">{error}</p>}
        <Button type="button" className="cosmos-draw mt-5 min-h-12 w-full sm:w-auto" disabled={!canGenerate} onClick={generate}><Sparkles size={17} />{loading ? 'Gemini 正在解读…' : '开始 Gemini 深度解读'}</Button>
        {loading && <p className="cosmos-context mt-3" role="status">正在生成一次临时解读。不会自动重试，请勿重复点击。</p>}
      </section>
    </section>

    {response && <CosmosAiResult response={response} selected={mode === 'dream' ? [] : selected} copied={copied} onCopy={copyResult} onClear={() => { setResponse(null); setCopied(false) }} onAnother={() => { setResponse(null); setQuestion(''); setDreamText(''); setCopied(false); resetApproval() }} />}
    <p className="cosmos-disclaimer mx-auto mt-6 max-w-5xl text-xs leading-6">AI 解读属于传统象征与个人反思，不是科学验证、事实判断、专业建议或确定预测。五个本地系统在 Gemini 不可用时仍可独立使用。</p>
  </div>
}

function CosmosAiResult({ response, selected, copied, onCopy, onClear, onAnother }: { response: CosmosAiResponse; selected: CosmosSystemId[]; copied: boolean; onCopy: () => void; onClear: () => void; onAnother: () => void }) {
  return <section className="ask-result mx-auto mt-7 max-w-5xl" aria-labelledby="ask-result-heading" aria-live="polite">
    <div className="ask-result-heading"><div><p className="section-label">Gemini reflection · 临时结果</p><h2 id="ask-result-heading">象征性解读</h2></div><div>{selected.map((system) => <span key={system}>{COSMOS_SYSTEM_LABELS[system]}</span>)}</div></div>
    <article className="ask-result-card"><h3>整体反思</h3><p>{response.overallReflection}</p></article>
    {response.observations.map((item, index) => <article className="ask-result-card" key={`${item.source}-${index}`}><span>{item.source === 'dream' ? '梦境' : COSMOS_SYSTEM_LABELS[item.source]}</span><h3>{item.title}</h3><p>{item.reflection}</p></article>)}
    {response.comparison && <article className="ask-result-card"><h3>体系之间</h3><h4>相近主题</h4><ul>{response.comparison.sharedThemes.map((item) => <li key={item}>{item}</li>)}</ul><h4>差异与张力</h4><ul>{response.comparison.differences.map((item) => <li key={item}>{item}</li>)}</ul></article>}
    {response.dreamThemes && <article className="ask-result-card"><h3>梦中意象</h3>{response.dreamThemes.map((theme) => <div key={theme.image}><h4>{theme.image}</h4><p>{theme.associations.join('；')}</p><small>其他可能：{theme.alternatives.join('；')}</small></div>)}</article>}
    {response.alternatives.length > 0 && <article className="ask-result-card"><h3>其他理解与不确定性</h3><ul>{response.alternatives.map((item) => <li key={item}>{item}</li>)}</ul></article>}
    <article className="ask-result-card"><h3>给自己的三个问题</h3><ol>{response.reflectiveQuestions.map((item) => <li key={item}>{item}</li>)}</ol></article>
    <article className="ask-result-card is-limitation"><h3>限制</h3><p>{response.limitations}</p></article>
    <div className="ask-result-actions"><Button type="button" variant="secondary" onClick={onCopy}><Clipboard size={16} />{copied ? '已复制' : '复制结果'}</Button><Button type="button" variant="secondary" onClick={onClear}>清除结果</Button><Button type="button" onClick={onAnother}><RotateCcw size={16} />再问一个问题</Button></div>
  </section>
}
