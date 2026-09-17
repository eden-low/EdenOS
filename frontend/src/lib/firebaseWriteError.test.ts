import { describe, expect, it } from 'vitest'
import { classifyFirebaseWriteError, RecordNotFoundWriteError } from './firebaseWriteError'
import { OfflineExerciseWriteError, exerciseWriteErrorMessage } from './exerciseWriteError'
import { OfflineExpenseWriteError, expenseWriteErrorMessage } from './expenseWriteError'

describe('cloud write errors', () => {
  it.each([
    [{ code: 'firestore/permission-denied' }, 'permission-denied'],
    [{ code: 'not-found' }, 'not-found'],
    [{ code: 'unavailable' }, 'unavailable'],
    [{ code: 'firestore/deadline-exceeded' }, 'unavailable'],
    [{ code: 'auth/network-request-failed' }, 'unavailable'],
    [new RecordNotFoundWriteError('Expense'), 'not-found'],
    [new Error('unexpected'), 'unknown'],
    [null, 'unknown'],
  ] as const)('classifies %o as %s', (error, kind) => {
    expect(classifyFirebaseWriteError(error)).toBe(kind)
  })

  it('gives offline failures a clear unsaved message for both domains', () => {
    expect(expenseWriteErrorMessage(new OfflineExpenseWriteError(), 'create'))
      .toContain('draft has not been saved')
    expect(exerciseWriteErrorMessage(new OfflineExerciseWriteError(), 'update'))
      .toContain('changes have not been saved')
  })
})
