import { normalizeAnimeTitle } from '../src/domain/anime'
import { loadProviderConfigs } from '../sync/anime/config'
import { discoverAnimeCategoryPolicies } from '../sync/anime/contentPolicy'
import { mapConcurrent } from '../sync/anime/http'
import { createMacCmsProvider } from '../sync/anime/macCmsProvider'

const scanAll = process.argv.includes('--scan-all')
const providers = loadProviderConfigs().map((config) => createMacCmsProvider(config))
if (!providers.length) throw new Error('No Anime providers are configured')

const globalIdentities = new Set<string>()
const report = []
for (const provider of providers) {
  const policies = discoverAnimeCategoryPolicies(await provider.fetchCategories())
  const identities = new Set<string>()
  const categories = []
  for (const policy of policies) {
    const first = await provider.fetchPage(1, undefined, policy.typeId)
    let scanned = first.items
    if (scanAll && first.pageCount > 1) {
      const pages = Array.from({ length: first.pageCount - 1 }, (_, index) => index + 2)
      const results = await mapConcurrent(pages, 4, async (page) => provider.fetchPage(page, undefined, policy.typeId))
      for (const result of results) if (result.status === 'fulfilled') scanned = [...scanned, ...result.value.items]
    }
    for (const item of scanned) {
      const title = normalizeAnimeTitle(String(item.vod_name ?? ''))
      if (!title) continue
      const year = String(item.vod_year ?? '').trim() || 'unknown'
      const identity = `${title}|${year}|${policy.group}`
      identities.add(identity)
      globalIdentities.add(identity)
    }
    categories.push({ group: policy.group, categoryId: policy.typeId, total: first.total, pages: first.pageCount, pageSize: first.limit, scanned: scanned.length })
  }
  report.push({
    provider: provider.config.id,
    categories,
    approvedCategoryRows: categories.reduce((sum, category) => sum + category.total, 0),
    measuredUniqueEstimate: scanAll ? identities.size : null,
    requests: provider.stats.requests,
    retries: provider.stats.retries,
    failures: provider.stats.failures,
  })
}

console.log(JSON.stringify({ scanAll, providers: report, crossProviderCanonicalEstimate: scanAll ? globalIdentities.size : null }, null, 2))
