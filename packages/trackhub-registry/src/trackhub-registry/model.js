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
      .volatile({
        error: undefined,
      })
      .actions(self => ({
        connect() {
          console.log('here')
          self.clear()
          const trackDbId = readConfObject(self.configuration, 'trackDbId')
          console.log('here', trackDbId)
          fetch(
            `https://www.trackhubregistry.org/api/search/trackdb/${trackDbId}`,
          )
            .then(rawResponse => JSON.parse(rawResponse.buffer.toString()))
            .then(trackDb => {
              self.setTrackConfs(generateTracks(trackDb))
            })
            .catch(error => {
              self.setError(error)
            })
        },
      })),
  )
}
