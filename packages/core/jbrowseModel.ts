import { types } from 'mobx-state-tree'
import RpcManager from './rpc/RpcManager'
import { ConfigurationSchema } from './configuration'

import assemblyManager from './assemblyManager'
import assemblyConfigSchemasFactory from './assemblyConfigSchemas'

function jbrowseSessionFactory(pluginManager: any, rpcConfig: any) {
  const { assemblyConfigSchemas, dispatcher } = assemblyConfigSchemasFactory(
    pluginManager,
  )

  console.log(pluginManager.pluggableConfigSchemaType('track'))
  return (
    types
      .model('JBrowseWeb', {
        configuration: ConfigurationSchema('Root', {
          rpc: RpcManager.configSchema,

          // possibly consider this for global config editor
          highResolutionScaling: {
            type: 'number',
            defaultValue: 2,
          },
          updateUrl: {
            type: 'boolean',
            defaultValue: true,
          },
          useLocalStorage: {
            type: 'boolean',
            defaultValue: false,
          },
        }),
        assemblies: types.array(
          types.union({ dispatcher }, ...assemblyConfigSchemas),
        ),
        tracks: types.array(pluginManager.pluggableConfigSchemaType('track')),
      })
      .volatile(self => ({
        rpcManager: new RpcManager(
          pluginManager,
          self.configuration.rpc,
          rpcConfig,
          // @ts-ignore
          self.getRefNameMapForAdapter,
        ),
        refNameMaps: new Map(),
      }))
      // Grouping the "assembly manager" stuff under an `extend` just for
      // code organization
      .extend(assemblyManager)
  )
}

export default jbrowseSessionFactory
