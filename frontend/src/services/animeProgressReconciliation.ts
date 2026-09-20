import type { AnimeProgress } from '../types/anime'

export function newerAnimeProgress(
  local: AnimeProgress | undefined,
  cloud: AnimeProgress | undefined,
): AnimeProgress | undefined {
  if (!local) return cloud
  if (!cloud) return local
  return local.updatedAt >= cloud.updatedAt ? local : cloud
}

export function reconcileAnimeProgress(
  localItems: AnimeProgress[],
  cloudItems: AnimeProgress[],
): AnimeProgress[] {
  const local = new Map(localItems.map((item) => [item.externalId, item]))
  const cloud = new Map(cloudItems.map((item) => [item.externalId, item]))
  const externalIds = new Set([...local.keys(), ...cloud.keys()])

  return [...externalIds].flatMap((externalId) => {
    const winner = newerAnimeProgress(local.get(externalId), cloud.get(externalId))
    return winner ? [winner] : []
  }).sort((left, right) => right.updatedAt - left.updatedAt)
}
