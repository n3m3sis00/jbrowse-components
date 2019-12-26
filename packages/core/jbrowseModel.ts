import { ConfigurationSchema } from '@gmod/jbrowse-core/configuration'
import PluginManager from '@gmod/jbrowse-core/PluginManager'
import RpcManager from '@gmod/jbrowse-core/rpc/RpcManager'
import { types, SnapshotIn } from 'mobx-state-tree'
import assemblyManager from '@gmod/jbrowse-core/assemblyManager'
import * as rpcFuncs from './rpcMethods'
import AssemblyConfigSchemasFactory from './assemblyConfigSchemas'
import corePlugins from './corePlugins'
// @ts-ignore
import RenderWorker from './rpc.worker'
import sessionModelFactory from './sessionModelFactory'

const pluginManager = new PluginManager(corePlugins.map(P => new P()))
pluginManager.configure()

export const Session = sessionModelFactory(pluginManager)
const { assemblyConfigSchemas, dispatcher } = AssemblyConfigSchemasFactory(
  pluginManager,
)

type SessionSnapshot = SnapshotIn<typeof Session>

const JBrowseWeb = types
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
    tracks: types.array(pluginManager.pluggableConfigSchemaType('track')),
    assemblies: types.array(
      types.union({ dispatcher }, ...assemblyConfigSchemas),
    ),
    connections: types.array(
      pluginManager.pluggableConfigSchemaType('connection'),
    ),
    defaultSession: types.optional(types.frozen(Session), {
      name: `New Session`,
      menuBars: [{ type: 'MainMenuBar' }],
    }),
    savedSessions: types.array(types.frozen(Session)),
  })
  .actions(self => ({
    addSavedSession(sessionSnapshot: SessionSnapshot) {
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
    addTrackConf(trackConf: { type: string }) {
      const { type } = trackConf
      if (!type) throw new Error(`unknown track type ${type}`)
      const length = self.tracks.push(trackConf)
      return self.tracks[length - 1]
    },
    addConnectionConf(connectionConf: { type: string }) {
      const { type } = connectionConf
      if (!type) throw new Error(`unknown connection type ${type}`)
      const length = self.connections.push(connectionConf)
      return self.connections[length - 1]
    },
  }))
  .views(self => ({
    get savedSessionNames() {
      return self.savedSessions.map(sessionSnap => sessionSnap.name)
    },
  }))
  // Grouping the "assembly manager" stuff under an `extend` just for
  // code organization
  .extend(assemblyManager)
  .volatile(self => ({
    rpcManager: new RpcManager(
      pluginManager,
      self.configuration.rpc,
      {
        WebWorkerRpcDriver: { WorkerClass: RenderWorker },
        MainThreadRpcDriver: { rpcFuncs },
      },
      // @ts-ignore
      self.getRefNameMapForAdapter,
    ),
    refNameMaps: new Map(),
  }))

export default JBrowseWeb
