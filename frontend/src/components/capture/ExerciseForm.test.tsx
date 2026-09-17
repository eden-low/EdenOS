import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ExerciseForm } from './ExerciseForm'

const occurredAt = new Date(2026, 8, 17, 14, 30).toISOString()

function setInput(label: RegExp | string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('Exercise form conversion', () => {
  it('stores whole minutes as seconds and optional distance as metres', () => {
    const onSubmit = vi.fn()
    render(<ExerciseForm submitLabel="Review" onSubmit={onSubmit} onCancel={vi.fn()} />)
    setInput('Activity', '  Walk  ')
    setInput('Duration (minutes)', '30')
    setInput(/Distance/, '2400')
    setInput('Date', '2026-09-17')
    setInput('Time', '14:30')
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))

    expect(onSubmit).toHaveBeenCalledWith({
      activity: 'Walk', distanceMetres: 2400, durationSeconds: 1800,
      occurredAt, source: 'manual',
    })
  })

  it('omits cleared optional distance on edit rather than saving zero', () => {
    const onSubmit = vi.fn()
    render(<ExerciseForm
      initialData={{
        activity: 'Walk', distanceMetres: 2400, durationSeconds: 1800,
        occurredAt, source: 'manual',
      }}
      submitLabel="Review changes"
      onSubmit={onSubmit}
      onCancel={vi.fn()}
    />)
    setInput(/Distance/, '')
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }))

    const submitted = onSubmit.mock.calls[0][0]
    expect(submitted.durationSeconds).toBe(1800)
    expect(submitted).not.toHaveProperty('distanceMetres')
  })
})
