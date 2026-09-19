import type { AnimeCatalogueFilters, AnimeMediaType, AnimeRegion, AnimeStatus } from '../../types/anime'
import { useAnimeText } from '../../services/animeI18n'

const regions: Array<[AnimeRegion, string]> = [['japan', 'Japan'], ['china', 'China'], ['europe_us', 'Europe/US'], ['korea', 'Korea'], ['hong_kong_taiwan', 'Hong Kong/Taiwan'], ['other', 'Other']]
const genres = ['Action', 'Adventure', 'Animation', 'Comedy', 'Drama', 'Fantasy', 'Mystery', 'Romance', 'Sci-Fi', 'Sports']

function Chip({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-9 rounded-full border px-3 text-xs font-semibold outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)] ${active ? 'border-[var(--accent-primary)] bg-[var(--accent-wash)] text-[var(--accent-soft)]' : 'border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}>{children}</button>
}

export function AnimeFilters({ value, onChange }: { value: AnimeCatalogueFilters; onChange: (value: AnimeCatalogueFilters) => void }) {
  const t = useAnimeText()
  const hasSecondaryFilters = value.region !== undefined || value.genre !== undefined || value.status !== undefined || value.year !== undefined
  const localizedMedia: Array<[AnimeMediaType, string]> = [['anime', t('anime')], ['movie', t('movie')], ['tv_series', t('tvSeries')], ['documentary', t('documentary')]]
  return (
    <section aria-labelledby="anime-filters-title" className="mt-5">
      <h2 id="anime-filters-title" className="section-label">{t('mediaType')}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip active={!value.mediaType} onClick={() => onChange({ ...value, mediaType: undefined })}>{t('all')}</Chip>
        {localizedMedia.map(([type, label]) => <Chip key={type} active={value.mediaType === type} onClick={() => onChange({ ...value, mediaType: value.mediaType === type ? undefined : type })}>{label}</Chip>)}
      </div>
      <div className="mt-5 flex min-h-9 items-center justify-between gap-3">
        <h3 className="section-label">{t('filters')}</h3>
        {hasSecondaryFilters && <button type="button" onClick={() => onChange({ ...value, region: undefined, genre: undefined, status: undefined, year: undefined })} className="rounded-lg px-2 py-1 text-xs font-semibold text-[var(--accent-soft)] outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]">{t('clearFilters')}</button>}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <select aria-label={t('region')} className="form-control" value={value.region ?? ''} onChange={(event) => onChange({ ...value, region: (event.target.value || undefined) as AnimeRegion | undefined })}>
          <option value="">{t('allRegions')}</option>{regions.map(([region, label]) => <option key={region} value={region}>{label}</option>)}
        </select>
        <select aria-label={t('genre')} className="form-control" value={value.genre ?? ''} onChange={(event) => onChange({ ...value, genre: event.target.value || undefined })}>
          <option value="">{t('allGenres')}</option>{genres.map((genre) => <option key={genre}>{genre}</option>)}
        </select>
        <select aria-label={t('status')} className="form-control" value={value.status ?? ''} onChange={(event) => onChange({ ...value, status: (event.target.value || undefined) as AnimeStatus | undefined })}>
          <option value="">{t('allStatuses')}</option>{(['airing', 'completed'] as const).map((status) => <option key={status} value={status}>{status === 'airing' ? t('airing') : t('completed')}</option>)}
        </select>
        <input aria-label={t('year')} className="form-control" type="number" inputMode="numeric" min="1900" max="2200" placeholder={t('anyYear')} value={value.year ?? ''} onChange={(event) => onChange({ ...value, year: event.target.value ? Number(event.target.value) : undefined })} />
      </div>
    </section>
  )
}
