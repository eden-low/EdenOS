export interface StagingBuildMetadata {
  schema: 1
  sha: string
}

/** Only Netlify's actual staging branch build receives diagnostics. */
export function stagingBuildMetadata(env: Record<string, string | undefined>): StagingBuildMetadata | null {
  if (env.NETLIFY !== 'true' || env.CONTEXT !== 'branch-deploy' || env.BRANCH !== 'staging') return null
  if (!env.COMMIT_REF || !/^[a-f0-9]{40}$/i.test(env.COMMIT_REF)) {
    throw new Error('Staging diagnostics require a valid Netlify COMMIT_REF.')
  }
  return { schema: 1, sha: env.COMMIT_REF.toLowerCase() }
}
