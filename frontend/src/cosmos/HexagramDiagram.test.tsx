import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HexagramDiagram } from './HexagramDiagram'

describe('HexagramDiagram', () => {
  it('renders top-to-bottom while keeping line positions and moving indicators accessible', () => {
    const { container } = render(<HexagramDiagram lines={[0, 1, 0, 1, 0, 1]} values={[6, 7, 8, 9, 8, 7]} label="测试卦" />)
    const rows = container.querySelectorAll('.iching-line-row')
    expect(rows).toHaveLength(6)
    expect(rows[0].getAttribute('aria-label')).toContain('第 6 爻')
    expect(rows[5].getAttribute('aria-label')).toContain('第 1 爻')
    expect(screen.getAllByLabelText(/动爻$/)).toHaveLength(2)
    expect(container.querySelectorAll('.iching-moving-mark')).toHaveLength(6)
  })
})
