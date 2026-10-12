import { isMovingLine, isYangLine, lineValueName, type IChingLineValue } from './ichingCoins'
import type { YinYang } from './ichingTrigrams'

type HexagramDiagramProps = {
  lines: readonly (IChingLineValue | YinYang | null)[]
  values?: readonly IChingLineValue[]
  label: string
  compact?: boolean
}

export function HexagramDiagram({ lines, values, label, compact = false }: HexagramDiagramProps) {
  const positions = [6, 5, 4, 3, 2, 1]
  return <div className={`iching-diagram ${compact ? 'iching-diagram-compact' : ''}`} role="group" aria-label={label}>
    {positions.map((position) => {
      const rawLine = lines[position - 1]
      const lineValue = values?.[position - 1]
      const yang = rawLine == null ? null : lineValue == null ? rawLine === 1 : isYangLine(lineValue)
      const moving = lineValue != null && isMovingLine(lineValue)
      const accessibleValue = lineValue == null ? (yang == null ? '尚未掷出' : yang ? '阳爻' : '阴爻') : lineValueName(lineValue)
      return <div key={position} className={`iching-line-row ${moving ? 'is-moving' : ''} ${yang == null ? 'is-empty' : ''}`} aria-label={`第 ${position} 爻，${accessibleValue}${moving ? '，动爻' : ''}`}>
        {!compact && <span className="iching-line-number">{position}</span>}
        <span className={`iching-line-mark ${yang ? 'is-yang' : 'is-yin'}`}>
          {yang === false && <><i /><i /></>}
          {yang === true && <i />}
        </span>
        {!compact && <span className="iching-moving-mark" aria-hidden="true">{moving ? '动' : ''}</span>}
      </div>
    })}
  </div>
}
