import {
  ConfigurationReference,
  readConfObject,
} from '@gmod/jbrowse-core/configuration'
import connectionModelFactory from '@gmod/jbrowse-core/BaseConnectionModel'
import { types } from 'mobx-state-tree'
import { fetch } from '@gmod/jbrowse-core/util/io'
import configSchema from './configSchema'
import { generateTracks } from './tracks'

export default function(pluginManager) {
  return types.compose(
    'UCSCTrackHubRegistryConnection',
    connectionModelFactory(pluginManager),
    types
      .model({
        type: types.literal('UCSCTrackHubRegistryConnection'),
        configuration: ConfigurationReference(configSchema),
      })
      .volatile(() => ({
        error: undefined,
      }))
      .actions(self => ({
        async connect() {
          try {
            self.clear()
            const trackDbId = readConfObject(self.configuration, 'trackDbId')
            const response = await fetch(
              `https://www.trackhubregistry.org/api/search/trackdb/${trackDbId}`,
            )
            const trackDb = JSON.parse(response.buffer.toString())
            self.setTrackConfs(generateTracks(trackDb._source))
          } catch (error) {
            console.error(error)
            self.setError(error)
          }
        },
        setError(error) {
          self.error = error
        },
      })),
  )
}
