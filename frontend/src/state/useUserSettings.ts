import { useContext } from 'react'
import { UserSettingsContext } from './userSettingsContextDefinition'

export function useUserSettings() {
  const context = useContext(UserSettingsContext)
  if (!context) throw new Error('UserSettingsProvider is missing')
  return context
}
