import type { CSSProperties } from 'react'
import { EARTHLY_BRANCH_GRID, PALACE_PRESENTATION } from './ziweiData'
import type { ZiWeiChart as ZiWeiChartData, ZiWeiPalace } from './ziweiAdapter'

function PalaceButton({ palace, selected, onSelect }: { palace: ZiWeiPalace; selected: boolean; onSelect: () => void }) {
  const presentation = PALACE_PRESENTATION[palace.name]
  const markers = [palace.isLifePalace ? '命' : '', palace.isBodyPalace ? '身' : ''].filter(Boolean)
  return <button
    type="button"
    className="ziwei-palace-cell"
    style={{ gridArea: EARTHLY_BRANCH_GRID[palace.earthlyBranch] } as CSSProperties}
    aria-pressed={selected}
    aria-label={`${presentation.label}，${palace.heavenlyStem}${palace.earthlyBranch}${markers.length ? `，${markers.join('、')}宫` : ''}，查看详情`}
    onClick={onSelect}
  >
    <span className="ziwei-palace-heading"><strong>{presentation.label}</strong><small>{palace.heavenlyStem}{palace.earthlyBranch}</small></span>
    {markers.length > 0 && <span className="ziwei-cell-markers" aria-hidden="true">{markers.map((marker) => <i key={marker}>{marker}</i>)}</span>}
    <span className="ziwei-cell-stars">
      {palace.majorStars.length ? palace.majorStars.map((star) => <b key={star.name}>{star.name}{star.transformation ? <em>化{star.transformation}</em> : null}</b>) : <small>无主星</small>}
    </span>
  </button>
}

export function ZiWeiChart({ chart, selectedBranch, onSelect }: {
  chart: ZiWeiChartData
  selectedBranch: string
  onSelect: (palace: ZiWeiPalace) => void
}) {
  return <figure className="ziwei-chart-figure" aria-labelledby="ziwei-chart-caption">
    <div className="ziwei-chart-grid">
      {chart.palaces.map((palace) => <PalaceButton key={palace.earthlyBranch} palace={palace} selected={palace.earthlyBranch === selectedBranch} onSelect={() => onSelect(palace)} />)}
      <div className="ziwei-chart-center">
        <p>紫微斗数</p>
        <strong>{chart.fiveElementsBureau}</strong>
        <span>{chart.lunarDate}</span>
        <span>{chart.timeLabel}</span>
        <small>命宫 {chart.lifePalaceBranch} · 身宫 {chart.bodyPalaceBranch}</small>
      </div>
    </div>
    <figcaption id="ziwei-chart-caption">十二宫依固定地支方位排列。点选任一宫位，在下方阅读完整星曜与术语说明。</figcaption>
  </figure>
}
