import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { createGeminiCosmosProvider } from './geminiCosmosProvider'
import type { CosmosReadingDependencies } from './cosmosReadingHandler'

interface ServiceAccountConfig { project_id: string; client_email: string; private_key: string }

function readServiceAccount(): ServiceAccountConfig | null {
  const value = process.env.EDENOS_GOOGLE_SERVICE_ACCOUNT_JSON
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || !('project_id' in parsed) || typeof parsed.project_id !== 'string' ||
        !('client_email' in parsed) || typeof parsed.client_email !== 'string' || !('private_key' in parsed) ||
        typeof parsed.private_key !== 'string' || !parsed.project_id.trim() || !parsed.client_email.trim() || !parsed.private_key.trim()) return null
    return parsed as ServiceAccountConfig
  } catch { return null }
}

function authorizedUids(): Set<string> {
  return new Set((process.env.COSMOS_AUTHORIZED_FIREBASE_UIDS ?? '').split(',').map((value) => value.trim()).filter(Boolean))
}

export function isAuthorizedCosmosIdentity(decoded: { uid: string; firebase?: { sign_in_provider?: string } }, allowlist: ReadonlySet<string>): boolean {
  return decoded.firebase?.sign_in_provider !== 'anonymous' && allowlist.has(decoded.uid)
}

export function cosmosModel(env: NodeJS.ProcessEnv): string | null {
  const value = env.COSMOS_GEMINI_MODEL?.trim() || 'gemini-2.5-flash'
  return /^gemini-[a-z0-9.-]{1,60}$/.test(value) ? value : null
}

export function createCosmosReadingRuntime(): CosmosReadingDependencies {
  const serviceAccount = readServiceAccount()
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  const allowlist = authorizedUids()
  const model = cosmosModel(process.env)
  const provider = apiKey ? createGeminiCosmosProvider(apiKey) : null
  return {
    isConfigured: () => serviceAccount !== null && provider !== null && model !== null && allowlist.size > 0,
    async authorize(token) {
      if (!serviceAccount) throw new Error('Firebase Admin is not configured')
      const app = getApps().find((item) => item.name === 'edenos-cosmos-reading') ?? initializeApp({
        credential: cert({ projectId: serviceAccount.project_id, clientEmail: serviceAccount.client_email, privateKey: serviceAccount.private_key }),
      }, 'edenos-cosmos-reading')
      const decoded = await getAuth(app).verifyIdToken(token)
      return isAuthorizedCosmosIdentity(decoded, allowlist) ? 'authorized' : 'unauthorized'
    },
    async interpret(input) {
      if (!provider || !model) throw new Error('Cosmos provider is not configured')
      return provider.interpret(input, model)
    },
  }
}
