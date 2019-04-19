import { getSnapshot } from 'mobx-state-tree'
import MyPlugin from './index'
import { createTestEnv } from '../../JBrowse'

test('plugin in a stock JBrowse', async () => {
  const { pluginManager } = await createTestEnv()
  expect(() => pluginManager.addPlugin(new MyPlugin())).toThrow(
    /JBrowse already configured, cannot add plugins/,
  )

  const BigBedAdapter = pluginManager.getAdapterType('BigBedAdapter')
  const config = BigBedAdapter.configSchema.create({ type: 'BigBedAdapter' })
  expect(getSnapshot(config)).toMatchSnapshot({
    configId: expect.any(String),
  })
})
