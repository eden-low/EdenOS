import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WeeklyReflection } from './WeeklyReflection'

const repository = vi.hoisted(() => ({ subscribe: vi.fn(), save: vi.fn() }))
vi.mock('../../state/useFirebaseAuth', () => ({ useFirebaseAuth: () => ({ uid: 'owner', firestore: {} }) }))
vi.mock('../../repositories/firestoreWeeklyReviewRepository', () => ({ createFirestoreWeeklyReviewRepository: () => repository }))

describe('WeeklyReflection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    repository.subscribe.mockImplementation((_weekKey, observer) => { observer.next(null); return () => undefined })
    repository.save.mockResolvedValue(undefined)
  })

  it('persists only the three reflection answers after an explicit save', async () => {
    render(<WeeklyReflection weekKey="2026-09-21" />)
    fireEvent.change(screen.getByLabelText('What went well?'), { target: { value: 'Moved consistently' } })
    expect(repository.save).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Save reflection' }))
    await waitFor(() => expect(repository.save).toHaveBeenCalledWith('2026-09-21', { wentWell: 'Moved consistently', improve: '', nextFocus: '' }))
  })
})
