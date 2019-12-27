import { getSnapshot, types, cast, SnapshotIn } from 'mobx-state-tree'
import RpcManager from './rpc/RpcManager'
import jbrowseModelFactory from './jbrowseModel'
import sessionModelFactory from './sessionModelFactory'

function rootModelFactory(pluginManager: any, rpcConfig: any) {
  const session = sessionModelFactory(pluginManager)
  return types
    .model('Root', {
      jbrowse: jbrowseModelFactory(pluginManager),
      session: types.maybe(sessionModelFactory(pluginManager)),
    })
    .actions(self => ({
      setSession(sessionSnapshot: SnapshotIn<typeof session>) {
        self.session = cast(sessionSnapshot)
      },
      setDefaultSession() {
        this.setSession({
          name: `test`,
          menuBars: [{ id: 'testing', type: 'MainMenuBar' }],
        })
      },
    }))
    .volatile(self => ({
      history: {},
      rpcManager: new RpcManager(
        pluginManager,
        {},
        rpcConfig,
        // @ts-ignore
        self.getRefNameMapForAdapter,
      ),
      refNameMaps: new Map(),
    }))
    .actions(self => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setHistory(history: any) {
        self.history = history
      },
    }))
}
export default rootModelFactory
