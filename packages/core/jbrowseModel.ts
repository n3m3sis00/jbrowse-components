import { types, SnapshotIn } from 'mobx-state-tree'
import RpcManager from './rpc/RpcManager'
import { ConfigurationSchema } from './configuration'

import assemblyManager from './assemblyManager'
import assemblyConfigSchemasFactory from './assemblyConfigSchemas'
import sessionModelFactory from './sessionModelFactory'

type SessionSnapshot = SnapshotIn<ReturnType<typeof sessionModelFactory>>

function jbrowseSessionFactory(pluginManager: any, rpcConfig: any) {
  const { assemblyConfigSchemas, dispatcher } = assemblyConfigSchemasFactory(
    pluginManager,
  )
  const Session = sessionModelFactory(pluginManager)

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
        defaultSession: types.optional(types.frozen(Session), {
          name: `New Session`,
          menuBars: [{ type: 'MainMenuBar' }],
        }),
        savedSessions: types.array(types.frozen(Session)),
      })
      .actions(self => ({
        addSavedSession(sessionSnapshot: SnapshotIn<typeof Session>) {
          const length = self.savedSessions.push(sessionSnapshot)
          return self.savedSessions[length - 1]
        },
        removeSavedSession(sessionSnapshot: SessionSnapshot) {
          self.savedSessions.remove(sessionSnapshot)
        },
        replaceSavedSession(oldName: string, snapshot: SessionSnapshot) {
          const savedSessionIndex = self.savedSessions.findIndex(
            savedSession => savedSession.name === oldName,
          )
          self.savedSessions[savedSessionIndex] = snapshot
        },
        updateSavedSession(sessionSnapshot: SessionSnapshot) {
          const sessionIndex = self.savedSessions.findIndex(
            savedSession => savedSession.name === sessionSnapshot.name,
          )
          if (sessionIndex === -1) self.savedSessions.push(sessionSnapshot)
          else self.savedSessions[sessionIndex] = sessionSnapshot
        },
      }))
      .views(self => ({
        get savedSessionNames() {
          return self.savedSessions.map(sessionSnap => sessionSnap.name)
        },
      }))
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
