import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Anime incremental workflow', () => {
  it('schedules the bounded incremental updater without overlapping or cancelling a running sync', async () => {
    const workflow = await readFile(path.resolve(process.cwd(), '../.github/workflows/anime-sync.yml'), 'utf8')
    expect(workflow).toContain('- cron: "30 8 * * *"')
    expect(workflow).toMatch(/concurrency:\s+group: anime-content-sync\s+cancel-in-progress: false/)
    expect(workflow).toContain("SYNC_MODE: ${{ github.event_name == 'schedule' && 'incremental'")
    expect(workflow).toContain("SYNC_CONTROLLED: ${{ github.event_name == 'schedule' && 'true'")
    expect(workflow).toContain("SYNC_MAX_FIRESTORE_WRITES: ${{ github.event_name == 'schedule' && '3000'")
    expect(workflow).toContain("SYNC_MAX_FIRESTORE_READS: ${{ github.event_name == 'schedule' && '10000'")
    expect(workflow).toContain("SYNC_INCREMENTAL_STATE_ID: ${{ github.event_name == 'schedule' && 'anime-incremental-v1'")
  })
})
