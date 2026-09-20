import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FitnessScreenshotCaptureForm } from './FitnessScreenshotCaptureForm'

describe('FitnessScreenshotCaptureForm guidance', () => {
  it('asks for one workout detail while keeping manual entry available', () => {
    render(<FitnessScreenshotCaptureForm onContinue={vi.fn()} onCancel={vi.fn()} onManual={vi.fn()} onDirtyChange={vi.fn()} />)
    expect(screen.getByText(/one completed Workout detail/i)).toBeTruthy()
    expect(screen.getByText(/Daily Activity or daily Steps/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /enter manually/i })).toBeTruthy()
  })
})
