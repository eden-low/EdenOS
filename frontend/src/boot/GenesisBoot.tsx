import type { ReactNode } from 'react'
import { useRecords } from '../state/useRecords'
import { useUserSettings } from '../state/useUserSettings'
import { usePwaUpdate } from '../pwa/usePwaUpdate'
import { usePrivacyLock } from '../privacy/usePrivacyLock'
import { GenesisBootProvider } from './GenesisBootProvider'
import { useBootAuthState } from './bootAuthContext'

/** Mounted only inside the existing authentication and records gates. */
export function GenesisBoot({ children }: { children: ReactNode }) {
  const records = useRecords()
  const settings = useUserSettings()
  const pwa = usePwaUpdate()
  const privacy = usePrivacyLock()
  const auth = useBootAuthState()
  const statuses = [records.expenseStatus, records.incomeStatus, records.exerciseStatus, settings.status]
  return <GenesisBootProvider
    authSession={auth.session}
    ready={!auth.pending && statuses.every((status) => status === 'loaded')}
    blocked={statuses.includes('error') || pwa.updateAvailable || privacy.locked || records.drafts.some((draft) => draft.status === 'draft')}
  >{children}</GenesisBootProvider>
}
