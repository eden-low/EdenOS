import { createWeatherHandler } from '../../server/weatherHandler'
import { createWeatherRuntime } from '../../server/weatherRuntime'
import { createNetlifyLegacyHandler } from '../../server/netlifyLegacyAdapter'

export const handler = createNetlifyLegacyHandler(createWeatherHandler(createWeatherRuntime()))
