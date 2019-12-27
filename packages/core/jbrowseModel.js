import { types } from 'mobx-state-tree'
import { ConfigurationSchema } from './configuration'

import assemblyManager from './assemblyManager'
import assemblyConfigSchemasFactory from './assemblyConfigSchemas'

function jbrowseSessionFactory(pluginManager) {
  const { assemblyConfigSchemas, dispatcher } = assemblyConfigSchemasFactory(
    pluginManager,
  )

  console.log(pluginManager.pluggableConfigSchemaType('track'))
  return (
    types
      .model('JBrowseWeb', {
        configuration: ConfigurationSchema('Root', {
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
        test: types.string,
        assemblies: types.array(
          types.union({ dispatcher }, ...assemblyConfigSchemas),
        ),
        tracks: types.array(pluginManager.pluggableConfigSchemaType('track')),
      })
      // Grouping the "assembly manager" stuff under an `extend` just for
      // code organization
      .extend(assemblyManager)
  )
}

export default jbrowseSessionFactory
