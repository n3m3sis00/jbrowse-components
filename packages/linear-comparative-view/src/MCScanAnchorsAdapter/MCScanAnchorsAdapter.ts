/* eslint-disable @typescript-eslint/no-explicit-any */
import BaseAdapter, { BaseOptions } from '@gmod/jbrowse-core/BaseAdapter'
import { IFileLocation, IRegion } from '@gmod/jbrowse-core/mst-types'
import { GenericFilehandle } from 'generic-filehandle'
import { toArray } from 'rxjs/operators'
import { openLocation } from '@gmod/jbrowse-core/util/io'
import { ObservableCreate } from '@gmod/jbrowse-core/util/rxjs'
import SimpleFeature, { Feature } from '@gmod/jbrowse-core/util/simpleFeature'

type RowToGeneNames = {
  name1: string
  name2: string
  score: number
}[]

interface GeneNameToRows {
  [key: string]: number[]
}

export default class extends BaseAdapter {
  private initialized = false

  private geneAdapters: BaseAdapter[]

  private assemblyNames: string[]

  private mcscanAnchorsLocation: GenericFilehandle

  private geneNameToRows: GeneNameToRows

  private rowToGeneName: RowToGeneNames

  public static capabilities = ['getFeatures', 'getRefNames']

  public constructor(config: {
    mcscanAnchorsLocation: IFileLocation
    geneAdapters: any
    assemblyNames: string[]
  }) {
    super()
    const { mcscanAnchorsLocation, geneAdapters, assemblyNames } = config
    this.mcscanAnchorsLocation = openLocation(mcscanAnchorsLocation)
    this.geneNameToRows = {}
    this.rowToGeneName = []
    this.geneAdapters = geneAdapters
    this.assemblyNames = assemblyNames
  }

  async setup(opts?: BaseOptions) {
    if (!this.initialized) {
      const text = (await this.mcscanAnchorsLocation.readFile('utf8')) as string
      text.split('\n').forEach((line: string, index: number) => {
        if (line.length) {
          if (line !== '###') {
            const [name1, name2, score] = line.split('\t')
            if (this.geneNameToRows[name1] === undefined) {
              this.geneNameToRows[name1] = []
            }
            if (this.geneNameToRows[name2] === undefined) {
              this.geneNameToRows[name2] = []
            }
            this.geneNameToRows[name1].push(index)
            this.geneNameToRows[name2].push(index)
            this.rowToGeneName[index] = { name1, name2, score: +score }
          }
        }
      })
      this.initialized = true
    }
  }

  async getRefNames(opts?: BaseOptions) {
    return []
  }

  /**
   * Fetch features for a certain region. Use getFeaturesInRegion() if you also
   * want to verify that the store has features for the given reference sequence
   * before fetching.
   * @param {IRegion} param
   * @param {AbortSignal} [signal] optional signalling object for aborting the fetch
   * @returns {Observable[Feature]} Observable of Feature objects in the region
   */
  getFeatures(region: IRegion, opts: BaseOptions = {}) {
    return ObservableCreate<Feature>(async observer => {
      await this.setup(opts)
      let feats
      const index = this.assemblyNames.indexOf(region.assemblyName)
      if (index !== -1) {
        feats = this.geneAdapters[index].getFeatures(region, {})
        const geneFeatures = await feats.pipe(toArray()).toPromise()
        geneFeatures.forEach(f => {
          ;(this.geneNameToRows[f.get('name')] || []).forEach(row => {
            observer.next(
              new SimpleFeature({ data: { ...f.toJSON(), syntenyId: row } }),
            )
          })
        })
      }

      observer.complete()
    })
  }

  /**
   * called to provide a hint that data tied to a certain region
   * will not be needed for the forseeable future and can be purged
   * from caches, etc
   */
  freeResources(/* { region } */): void {}
}
