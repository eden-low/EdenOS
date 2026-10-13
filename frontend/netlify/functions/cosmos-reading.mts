import { createCosmosReadingHandler } from '../../server/cosmosReadingHandler'
import { createCosmosReadingRuntime } from '../../server/cosmosReadingRuntime'
import { createNetlifyLegacyHandler } from '../../server/netlifyLegacyAdapter'

export const handler = createNetlifyLegacyHandler(createCosmosReadingHandler(createCosmosReadingRuntime()))
