import { describe, expect, it } from 'vitest'
import { stagingBuildMetadata } from '../../scripts/stagingBuildMetadata'

const sha = 'a'.repeat(40)
const staging = { NETLIFY: 'true', CONTEXT: 'branch-deploy', BRANCH: 'staging', COMMIT_REF: sha }

describe('staging build metadata boundary', () => {
  it('uses the actual commit being built and only emits public metadata', () => {
    expect(stagingBuildMetadata({ ...staging, API_KEY: 'must-not-be-copied', DEPLOY_ID: 'not-needed' })).toEqual({ schema: 1, sha })
    expect(stagingBuildMetadata({ ...staging, COMMIT_REF: 'B'.repeat(40) })?.sha).toBe('b'.repeat(40))
  })
  it.each([
    {}, { ...staging, NETLIFY: undefined }, { ...staging, NETLIFY: 'false' },
    { ...staging, CONTEXT: 'production', BRANCH: 'main' },
    { ...staging, CONTEXT: 'deploy-preview', BRANCH: 'staging' },
    { ...staging, BRANCH: 'feature/staging-diagnostics' },
  ])('keeps diagnostics absent outside the actual Netlify staging branch: %j', (env) => {
    expect(stagingBuildMetadata(env)).toBeNull()
  })
  it.each([undefined, '', '5b76bf2', 'not-a-sha', 'g'.repeat(40)])('fails a staging build rather than mislabeling its version: %s', (COMMIT_REF) => {
    expect(() => stagingBuildMetadata({ ...staging, COMMIT_REF })).toThrow('COMMIT_REF')
  })
})
