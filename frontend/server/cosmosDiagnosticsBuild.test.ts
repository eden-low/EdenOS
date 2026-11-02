// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { isStagingDiagnosticsBuild } from '../scripts/prepareCosmosDiagnostics'

describe('Cosmos diagnostic build gate', () => {
  it.each([
    [{}, false],
    [{ NETLIFY: 'true', CONTEXT: 'production', BRANCH: 'main' }, false],
    [{ NETLIFY: 'true', CONTEXT: 'production', BRANCH: 'staging' }, false],
    [{ NETLIFY: 'true', CONTEXT: 'deploy-preview', BRANCH: 'staging' }, false],
    [{ NETLIFY: 'true', CONTEXT: 'branch-deploy', BRANCH: 'feature/test' }, false],
    [{ CONTEXT: 'branch-deploy', BRANCH: 'staging' }, false],
    [{ NETLIFY: 'true', CONTEXT: 'branch-deploy', BRANCH: 'staging' }, true],
  ])('enables only the trusted Netlify staging branch deploy (%j)', (env, expected) => {
    expect(isStagingDiagnosticsBuild(env)).toBe(expected)
  })
})
