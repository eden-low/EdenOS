import type { ExactNatalChart, NatalChart } from './astrologyAdapter'
import { PLANETS, ZODIAC_SIGNS, planetMeta, zodiacForLongitude } from './astrologyData'

interface Point { x: number; y: number }

function pointFor(longitude: number, radius: number): Point {
  const radians = (longitude - 90) * Math.PI / 180
  return { x: 160 + Math.cos(radians) * radius, y: 160 + Math.sin(radians) * radius }
}

function exactChart(chart: NatalChart): chart is ExactNatalChart {
  return chart.kind === 'exact'
}

export function NatalChartWheel({ chart }: { chart: NatalChart }) {
  const exact = exactChart(chart)
  const planetPoints = exact
    ? chart.placements.map((placement, index, placements) => {
      const closeBefore = placements.slice(0, index).filter((other) => Math.min(Math.abs(other.longitude - placement.longitude), 360 - Math.abs(other.longitude - placement.longitude)) < 7).length
      return { ...placement, point: pointFor(placement.longitude, 94 - (closeBefore % 3) * 12) }
    })
    : []

  return <figure className="astrology-wheel-figure">
    <svg className="astrology-wheel" viewBox="0 0 320 320" role="img" aria-labelledby="natal-wheel-title natal-wheel-description">
      <title id="natal-wheel-title">{exact ? '本命盘圆盘 / Natal chart wheel' : '黄道十二宫参考圆盘 / Zodiac reference wheel'}</title>
      <desc id="natal-wheel-description">{exact
        ? `热带黄道行星位置${chart.houses.length ? '、整宫制宫位、上升点、天顶与主要相位' : '与主要相位；出生地点未提供，未绘制宫位和角点'}。`
        : '出生时间未知，因此只显示固定的黄道十二宫，不绘制精确行星、宫位或角点。'}</desc>
      <circle className="astrology-wheel-bg" cx="160" cy="160" r="151" />
      <circle className="astrology-wheel-ring" cx="160" cy="160" r="143" />
      <circle className="astrology-wheel-ring is-inner" cx="160" cy="160" r="116" />
      {ZODIAC_SIGNS.map((sign, index) => {
        const boundaryOuter = pointFor(index * 30, 143)
        const boundaryInner = pointFor(index * 30, 116)
        const label = pointFor(index * 30 + 15, 130)
        return <g key={sign.id}>
          <line className="astrology-zodiac-boundary" x1={boundaryInner.x} y1={boundaryInner.y} x2={boundaryOuter.x} y2={boundaryOuter.y} />
          <text className="astrology-zodiac-glyph" x={label.x} y={label.y} textAnchor="middle" dominantBaseline="central">{sign.glyph}</text>
        </g>
      })}
      {exact && chart.houses.map((house) => {
        const outer = pointFor(house.cuspLongitude, 115)
        const inner = pointFor(house.cuspLongitude, 53)
        const label = pointFor(house.cuspLongitude + 15, 108)
        return <g key={house.number}>
          <line className="astrology-house-boundary" x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />
          <text className="astrology-house-number" x={label.x} y={label.y} textAnchor="middle" dominantBaseline="central">{house.number}</text>
        </g>
      })}
      {exact && <g className="astrology-aspect-lines" aria-hidden="true">
        {chart.aspects.map((aspect) => {
          const first = planetPoints.find((planet) => planet.id === aspect.first)?.point
          const second = planetPoints.find((planet) => planet.id === aspect.second)?.point
          return first && second ? <line key={`${aspect.first}-${aspect.second}`} className={`is-${aspect.type}`} x1={first.x} y1={first.y} x2={second.x} y2={second.y} /> : null
        })}
      </g>}
      <circle className="astrology-wheel-core" cx="160" cy="160" r="51" />
      {planetPoints.map((planet) => <g key={planet.id} className="astrology-planet-marker" transform={`translate(${planet.point.x} ${planet.point.y})`}>
        <circle r="9" />
        <text textAnchor="middle" dominantBaseline="central">{planetMeta(planet.id).glyph}</text>
      </g>)}
      {exact && chart.ascendant !== null && <AngleMarker longitude={chart.ascendant} label="ASC" />}
      {exact && chart.midheaven !== null && <AngleMarker longitude={chart.midheaven} label="MC" />}
      {!exact && <text className="astrology-wheel-placeholder" x="160" y="156" textAnchor="middle">时间未知</text>}
      {!exact && <text className="astrology-wheel-placeholder is-small" x="160" y="172" textAnchor="middle">Date-only view</text>}
    </svg>
    <figcaption className="sr-only">
      {exact ? chart.placements.map((placement) => {
        const planet = planetMeta(placement.id)
        const zodiac = zodiacForLongitude(placement.longitude)
        return `${planet.chinese}${zodiac.sign.chinese}${placement.degree.toFixed(1)}度${placement.house ? `，第${placement.house}宫` : ''}`
      }).join('；') : '出生时间未知，未生成精确圆盘。'}
    </figcaption>
  </figure>
}

function AngleMarker({ longitude, label }: { longitude: number; label: string }) {
  const outer = pointFor(longitude, 151)
  const inner = pointFor(longitude, 111)
  const text = pointFor(longitude, 156)
  return <g className={`astrology-angle-marker is-${label.toLowerCase()}`}>
    <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />
    <text x={text.x} y={text.y} textAnchor="middle" dominantBaseline="central">{label}</text>
  </g>
}

export function PlanetLegend({ chart }: { chart: NatalChart }) {
  if (chart.kind !== 'exact') return null
  return <ul className="astrology-wheel-legend" aria-label="Planet symbols">
    {PLANETS.map((planet) => <li key={planet.id}><span>{planet.glyph}</span>{planet.chinese}</li>)}
  </ul>
}
