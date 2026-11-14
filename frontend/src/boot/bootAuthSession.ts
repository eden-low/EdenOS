/** UI-only, provider-lifetime state. No account identifiers leave this object. */
export interface BootAuthSession {
  readonly kind: 'restored' | 'sign-in'
  claim: () => boolean
  discard: () => void
}

export interface BootAuthSnapshot {
  readonly session: BootAuthSession | null
  readonly pending: boolean
}

export const emptyBootAuthSnapshot: BootAuthSnapshot = { session: null, pending: false }

function session(kind: BootAuthSession['kind'], interrupted: boolean): BootAuthSession {
  let consumed = interrupted
  return {
    kind,
    claim() {
      if (consumed) return false
      consumed = true
      return true
    },
    discard() { consumed = true },
  }
}

/** Observes existing UI auth outcomes; never calls Firebase or changes auth state. */
export class BootAuthSessions {
  private uid: string | null | undefined
  private current: BootAuthSession | null = null
  private interrupted = false
  private authenticated = false
  private actions = new Set<object>()
  private listeners = new Set<() => void>()
  private snapshot = emptyBootAuthSnapshot

  getSnapshot = (): BootAuthSnapshot => this.snapshot
  matches(uid: string) { return this.authenticated && this.uid === uid }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private publish() {
    const next = { session: this.authenticated ? this.current : null, pending: this.actions.size > 0 }
    if (next.session === this.snapshot.session && next.pending === this.snapshot.pending) return
    this.snapshot = next
    this.listeners.forEach((listener) => listener())
  }

  observe(status: 'initializing' | 'authenticated' | 'unauthenticated' | 'error', uid?: string) {
    this.authenticated = status === 'authenticated'
    if (status === 'authenticated' && uid !== undefined && uid !== this.uid) {
      const kind = this.uid === undefined ? 'restored' : 'sign-in'
      this.current = session(kind, kind === 'restored' && this.interrupted)
      this.uid = uid
    } else if (status === 'unauthenticated') {
      this.uid = null
      this.current = null
    } else if (status === 'error') {
      // Error recovery is not a new sign-in. Keep the last identity in memory.
      this.interrupted = true
      this.current?.discard()
    }
    this.publish()
  }

  async trackAction<T>(action: () => Promise<T>, successful: (result: T) => boolean = () => true): Promise<T> {
    const token = {}
    const previous = this.current
    this.actions.add(token)
    this.publish()
    let success = false
    try {
      const result = await action()
      success = successful(result)
      return result
    } finally {
      // An observer can report an identity before a popup promise settles.
      // Never welcome a candidate produced by a failed/cancelled operation.
      if (!success && this.current !== previous) this.current?.discard()
      this.actions.delete(token)
      this.publish()
    }
  }
}
