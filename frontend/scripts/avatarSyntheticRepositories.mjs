// Browser/PWA fixtures only. No real Firebase or remote media/data operations.
const modules = {
  'firestoreAnimeRepository.ts': `const a={externalId:'sample-anime',title:'Synthetic Anime',titleNormalized:'synthetic anime',score:8,mediaType:'anime',region:'japan',genres:[],status:'completed',year:2025,totalEpisodes:1,updatedAt:1,filterKeys:[]};export const createFirestoreAnimeRepository=()=>({fetchPage:async()=>({items:[a],total:1,hasMore:false}),fetchPublishedSince:async()=>[],countPublishedSince:async()=>0,fetchRecent:async()=>[],getCatalogueStatus:async()=>null,searchTitles:async()=>[a]});`,
  'firestoreWeeklyReviewRepository.ts': `export const createFirestoreWeeklyReviewRepository=()=>({subscribe:(_,h)=>{h.next(null);return()=>{}},save:async()=>{throw Error('No financial or reflection writes allowed')}});`,
  'animeDetailService.ts': `export class AnimeDetailError extends Error{};export const invalidateAnimeDetail=()=>{};export const loadAnimeDetail=async()=>({schemaVersion:1,externalId:'sample-anime',title:'Synthetic Anime',description:'Synthetic local media only',episodes:[{episodeNumber:1,title:'Fixture',sources:[{label:'Local synthetic video',format:'mp4',url:window.syntheticMediaUrl}]}]});`,
  'useGoalAllocations.ts': 'export const useGoalAllocations=()=>({allocations:[],status:"loaded"});',
}
export function syntheticRepositorySource(id) {
  return modules[id.replaceAll('\\', '/').split('?')[0].split('/').pop()]
}
