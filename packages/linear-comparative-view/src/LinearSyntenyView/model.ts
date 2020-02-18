import { types,Instance } from 'mobx-state-tree'
import baseModel from '../LinearComparativeView/model'

export default function stateModelFactory(pluginManager: any) {
  return types.compose(
    baseModel(pluginManager),
    types.model('LinearSyntenyView', {
      type: types.literal('LinearSyntenyView'),
    }),
  )
}
export type LinearSyntenyView = ReturnType<typeof stateModelFactory>
export type LinearSyntenyViewModel = Instance<LinearSyntenyView>
