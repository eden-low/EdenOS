export type FirebaseWriteErrorKind =
  | 'permission-denied'
  | 'not-found'
  | 'unavailable'
  | 'unknown'

export class RecordNotFoundWriteError extends Error {
  constructor(recordType: string) {
    super(`${recordType} record no longer exists.`)
    this.name = 'RecordNotFoundWriteError'
  }
}

function errorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null

  const code = error.code
  if (typeof code !== 'string') return null

  return code.toLowerCase().split('/').at(-1) ?? null
}

export function classifyFirebaseWriteError(error: unknown): FirebaseWriteErrorKind {
  if (error instanceof RecordNotFoundWriteError) return 'not-found'

  switch (errorCode(error)) {
    case 'permission-denied':
      return 'permission-denied'
    case 'not-found':
      return 'not-found'
    case 'unavailable':
    case 'deadline-exceeded':
    case 'network-request-failed':
      return 'unavailable'
    default:
      return 'unknown'
  }
}

export function logFirebaseWriteError(
  domain: 'expense' | 'exercise',
  action: 'create' | 'update' | 'delete',
  error: unknown,
) {
  if (import.meta.env.DEV) {
    console.error(`Cloud ${domain} ${action} failed.`, error)
  }
}
