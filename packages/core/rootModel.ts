import { types, cast, SnapshotIn } from 'mobx-state-tree'
import jbrowseModelFactory from './jbrowseModel'
import sessionModelFactory from './sessionModelFactory'

function rootModelFactory(pluginManager: any, rpcConfig: any) {
  const session = sessionModelFactory(pluginManager)
  return types
    .model('Root', {
      jbrowse: jbrowseModelFactory(pluginManager, rpcConfig),
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
    }))
    .actions(self => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setHistory(history: any) {
        self.history = history
      },
    }))
}
export default rootModelFactory
