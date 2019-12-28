import { UndoManager } from 'mst-middlewares'
import rootModelFactory from './rootModel'
import PluginManager from './PluginManager'

export function createTestSession(plugins, snapshot = {}) {
  const pluginManager = new PluginManager(plugins.map(P => new P()))
  pluginManager.configure()

  const root = rootModelFactory(pluginManager).create({
    jbrowse: {
      configuration: { rpc: { defaultDriver: 'MainThreadRpcDriver' } },
    },
  })
  root.setSession({
    name: 'testSession',
    ...snapshot,
  })
  root.setHistory(UndoManager.create({}, { targetStore: root.session }))
  return root.session
}
