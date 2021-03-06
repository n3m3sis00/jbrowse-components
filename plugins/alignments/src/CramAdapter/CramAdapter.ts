import { CraiIndex, IndexedCramFile } from '@gmod/cram'
import {
  BaseFeatureDataAdapter,
  BaseOptions,
} from '@jbrowse/core/data_adapters/BaseAdapter'
import { Region } from '@jbrowse/core/util/types'
import { checkAbortSignal } from '@jbrowse/core/util'
import { openLocation } from '@jbrowse/core/util/io'
import { readConfObject } from '@jbrowse/core/configuration'
import { ObservableCreate } from '@jbrowse/core/util/rxjs'
import { Feature } from '@jbrowse/core/util/simpleFeature'
import { toArray } from 'rxjs/operators'
import { AnyConfigurationModel } from '@jbrowse/core/configuration/configurationSchema'
import { getSubAdapterType } from '@jbrowse/core/data_adapters/dataAdapterCache'
import CramSlightlyLazyFeature from './CramSlightlyLazyFeature'

interface HeaderLine {
  tag: string
  value: string
}

interface Header {
  idToName?: string[]
  nameToId?: Record<string, number>
  readGroups?: number[]
}

export class CramAdapter extends BaseFeatureDataAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cram: any

  private sequenceAdapter: BaseFeatureDataAdapter

  public samHeader: Header = {}

  // maps a refname to an id
  private seqIdToRefName: string[] | undefined

  // maps a seqId to original refname, passed specially to render args, to a seqid
  private seqIdToOriginalRefName: string[] = []

  public constructor(
    config: AnyConfigurationModel,
    getSubAdapter?: getSubAdapterType,
  ) {
    super(config)

    const cramLocation = readConfObject(config, 'cramLocation')
    const craiLocation = readConfObject(config, 'craiLocation')
    if (!cramLocation) {
      throw new Error('missing cramLocation argument')
    }
    if (!craiLocation) {
      throw new Error('missing craiLocation argument')
    }
    this.cram = new IndexedCramFile({
      cramFilehandle: openLocation(cramLocation),
      index: new CraiIndex({ filehandle: openLocation(craiLocation) }),
      seqFetch: this.seqFetch.bind(this),
      checkSequenceMD5: false,
      fetchSizeLimit: config.fetchSizeLimit || 600000000,
    })
    // instantiate the sequence adapter
    const sequenceAdapterType = readConfObject(config, [
      'sequenceAdapter',
      'type',
    ])

    const dataAdapter = getSubAdapter?.(
      readConfObject(config, 'sequenceAdapter'),
    ).dataAdapter
    // TODO: BaseFeatureDataAdapter is different inside of the plugin build, needs to be gotten from pluginManager.lib
    if (dataAdapter instanceof BaseFeatureDataAdapter) {
      this.sequenceAdapter = dataAdapter
    } else {
      throw new Error(
        `CRAM feature adapters cannot use sequence adapters of type '${sequenceAdapterType}'`,
      )
    }
  }

  async getHeader(opts?: BaseOptions) {
    return this.cram.cram.getHeaderText(opts)
  }

  private async seqFetch(seqId: number, start: number, end: number) {
    start -= 1 // convert from 1-based closed to interbase

    const refSeqStore = this.sequenceAdapter
    if (!refSeqStore) return undefined
    const refName = this.refIdToOriginalName(seqId) || this.refIdToName(seqId)
    // console.log(`CRAM seq ID ${seqId} -> ${refName}`)
    if (!refName) return undefined

    const features = refSeqStore.getFeatures(
      {
        refName,
        start,
        end,
        assemblyName: '',
      },
      {},
    )

    const seqChunks = await features.pipe(toArray()).toPromise()

    const trimmed: string[] = []
    seqChunks
      .sort((a, b) => a.get('start') - b.get('start'))
      .forEach((chunk: Feature) => {
        const chunkStart = chunk.get('start')
        const chunkEnd = chunk.get('end')
        const trimStart = Math.max(start - chunkStart, 0)
        const trimEnd = Math.min(end - chunkStart, chunkEnd - chunkStart)
        const trimLength = trimEnd - trimStart
        const chunkSeq = chunk.get('seq') || chunk.get('residues')
        trimmed.push(chunkSeq.substr(trimStart, trimLength))
      })

    const sequence = trimmed.join('')
    if (sequence.length !== end - start) {
      throw new Error(
        `sequence fetch failed: fetching ${refName}:${(
          start - 1
        ).toLocaleString()}-${end.toLocaleString()} returned ${sequence.length.toLocaleString()} bases, but should have returned ${(
          end - start
        ).toLocaleString()}`,
      )
    }
    return sequence
  }

  private async setup(opts?: BaseOptions) {
    const { statusCallback = () => {} } = opts || {}
    if (Object.keys(this.samHeader).length === 0) {
      statusCallback('Downloading index')
      const samHeader = await this.cram.cram.getSamHeader(opts?.signal)

      // use the @SQ lines in the header to figure out the
      // mapping between ref ref ID numbers and names
      const idToName: string[] = []
      const nameToId: Record<string, number> = {}
      const sqLines = samHeader.filter((l: { tag: string }) => l.tag === 'SQ')
      sqLines.forEach((sqLine: { data: HeaderLine[] }, refId: number) => {
        sqLine.data.forEach((item: HeaderLine) => {
          if (item.tag === 'SN') {
            // this is the ref name
            const refName = item.value
            nameToId[refName] = refId
            idToName[refId] = refName
          }
        })
      })

      const rgLines = samHeader.filter((l: { tag: string }) => l.tag === 'RG')
      const readGroups = rgLines.map((rgLine: { data: HeaderLine[] }) => {
        const { value } =
          rgLine.data.find(item => {
            return item.tag === 'ID'
          }) || {}
        return value
      })
      if (idToName.length) {
        this.samHeader = { idToName, nameToId, readGroups }
      }
      statusCallback('')
    }
  }

  async getRefNames(opts?: BaseOptions) {
    await this.setup(opts)
    if (this.samHeader.idToName) {
      return this.samHeader.idToName
    }
    if (this.sequenceAdapter) {
      return this.sequenceAdapter.getRefNames()
    }
    throw new Error('unable to get refnames')
  }

  // use info from the SAM header if possible, but fall back to using
  // the ref seq order from when the browser's refseqs were loaded
  refNameToId(refName: string) {
    if (this.samHeader.nameToId) {
      return this.samHeader.nameToId[refName]
    }
    if (this.seqIdToRefName) {
      return this.seqIdToRefName.indexOf(refName)
    }
    return undefined
  }

  // use info from the SAM header if possible, but fall back to using
  // the ref seq order from when the browser's refseqs were loaded
  refIdToName(refId: number) {
    if (this.samHeader.idToName) {
      return this.samHeader.idToName[refId]
    }
    if (this.seqIdToRefName) {
      return this.seqIdToRefName[refId]
    }
    return undefined
  }

  refIdToOriginalName(refId: number) {
    return this.seqIdToOriginalRefName[refId]
  }

  getFeatures(
    region: Region & { originalRefName?: string },
    opts?: BaseOptions,
  ) {
    const { signal, statusCallback = () => {} } = opts || {}
    const { refName, start, end, originalRefName } = region

    return ObservableCreate<Feature>(async observer => {
      await this.setup(opts)
      if (this.sequenceAdapter && !this.seqIdToRefName) {
        this.seqIdToRefName = await this.sequenceAdapter.getRefNames(opts)
      }
      const refId = this.refNameToId(refName)
      if (refId !== undefined) {
        if (originalRefName) {
          this.seqIdToOriginalRefName[refId] = originalRefName
        }
        statusCallback('Downloading alignments')
        const records = await this.cram.getRecordsForRange(
          refId,
          start,
          end,
          opts,
        )
        checkAbortSignal(signal)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        records.forEach((record: any) => {
          observer.next(this.cramRecordToFeature(record))
        })
      }
      statusCallback('')
      observer.complete()
    }, signal)
  }

  freeResources(/* { region } */): void {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cramRecordToFeature(record: any): Feature {
    return new CramSlightlyLazyFeature(record, this)
  }
}

export default () => {
  return CramAdapter
}
