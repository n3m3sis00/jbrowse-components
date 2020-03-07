/* eslint-disable  no-continue, no-plusplus */
import ComparativeServerSideRendererType from '@gmod/jbrowse-core/pluggableElementTypes/renderers/ComparativeServerSideRendererType'
import { Feature } from '@gmod/jbrowse-core/util/simpleFeature'
import { IRegion } from '@gmod/jbrowse-core/mst-types'
import {
  createCanvas,
  createImageBitmap,
} from '@gmod/jbrowse-core/util/offscreenCanvasPonyfill'
import React from 'react'
import { overlayYPos, interstitialYPos, getPxFromCoordinate } from '../util'

const [LEFT, , RIGHT] = [0, 1, 2, 3]

export interface ReducedLinearGenomeViewModel {
  bpPerPx: number
  offsetPx: number
  staticBlocks: IRegion[]
  dynamicBlocks: IRegion[]
  headerHeight: number
  scaleBarHeight: number
  height: number
  reversed: boolean
  features: Feature[]
  tracks: {
    scrollTop: number
    height: number
    trackId: string
  }[]
}

interface LayoutMatch {
  level: number
  layout: LayoutTuple
  feature: Feature
  refName: string
}
interface LinearSyntenyRenderProps {
  config: any // eslint-disable-line @typescript-eslint/no-explicit-any
  height: number
  width: number
  horizontallyFlipped: boolean
  highResolutionScaling: number
  trackIds: string[]
  views: ReducedLinearGenomeViewModel[]
}

interface LinearSyntenyRenderingProps extends LinearSyntenyRenderProps {
  imageData: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface LinearSyntenyImageData {
  imageData?: ImageBitmap
  height: number
  width: number
  maxHeightReached: boolean
}
interface LayoutRecord {
  feature: Feature
  leftPx: number
  rightPx: number
  topPx: number
  heightPx: number
}

export type LayoutTuple = [number, number, number, number]

function* generateMatches(l1: Feature[], l2: Feature[]) {
  let i = 0
  let j = 0
  console.log('here')
  while (i < l1.length && j < l2.length) {
    const a = l1[i].get('syntenyId')
    const b = l2[j].get('syntenyId')
    if (a < b) {
      i++
    } else if (b < a) {
      j++
    } else {
      console.log(l1, l2)
      yield [l1[i], l2[j]]
      i++
      j++
    }
  }
}

export default class LinearSyntenyRenderer extends ComparativeServerSideRendererType {
  async makeImageData(props: LinearSyntenyRenderProps) {
    const { highResolutionScaling = 1, width, height, views, trackIds } = props

    views.forEach(view => {
      view.features.sort((a, b) => a.get('syntenyId') - b.get('syntenyId'))
    })

    //     const viewMaps = views.map(view =>
    //       Object.fromEntries(
    //         view.features.map(feature => [feature.get('syntenyId'), feature]),
    //       ),
    //     )
    //
    //console.log(views.map(view => view.features))

    const pairs = []
    for (let i = 0; i < views.length; i++) {
      for (let j = 0; j < views.length; j++) {
        if (i != j) {
          // NOTE: we might need intra-view "synteny" e.g. ortholog?
          // similar to breakpoint squiggles in a single LGV
          for (const match of generateMatches(
            views[i].features,
            views[j].features,
          )) {
            pairs.push(match)
          }
        }
      }
    }

    const canvas = createCanvas(
      Math.ceil(width * highResolutionScaling),
      height * highResolutionScaling,
    )
    const ctx = canvas.getContext('2d')
    ctx.scale(highResolutionScaling, highResolutionScaling)
    ctx.fillStyle = 'red'
    const showIntraviewLinks = false
    const middle = true
    const hideTiny = false

    layoutMatches.forEach(chunk => {
      // we follow a path in the list of chunks, not from top to bottom, just in series
      // following x1,y1 -> x2,y2
      for (let i = 0; i < chunk.length - 1; i += 1) {
        const { layout: c1, feature: f1, level: level1, refName: ref1 } = chunk[
          i
        ]
        const { layout: c2, feature: f2, level: level2, refName: ref2 } = chunk[
          i + 1
        ]
        const v1 = views[level1]
        const v2 = views[level2]

        if (!c1 || !c2) {
          console.warn('received null layout for a overlay feature')
          return
        }

        // disable rendering connections in a single level
        if (!showIntraviewLinks && level1 === level2) {
          return
        }
        const length1 = f1.get('end') - f1.get('start')
        const length2 = f2.get('end') - f2.get('start')

        if (length1 < v1.bpPerPx || length2 < v2.bpPerPx) {
          if (hideTiny) {
            continue
          }
        }
        if (
          !v1.staticBlocks.find(region => region.refName === ref1) ||
          !v2.staticBlocks.find(region => region.refName === ref2)
        ) {
          continue
        }

        const x11 = getPxFromCoordinate(v1, ref1, c1[LEFT])
        const x12 = getPxFromCoordinate(v1, ref1, c1[RIGHT])
        const x21 = getPxFromCoordinate(v2, ref2, c2[LEFT])
        const x22 = getPxFromCoordinate(v2, ref2, c2[RIGHT])

        const y1 = middle
          ? interstitialYPos(level1 < level2, height)
          : overlayYPos(trackIds[0], level1, views, c1, level1 < level2)
        const y2 = middle
          ? interstitialYPos(level2 < level1, height)
          : overlayYPos(trackIds[1], level2, views, c2, level2 < level1)

        ctx.fillStyle = 'rgba(255,100,100,0.3)'
        ctx.strokeStyle = 'rgba(50,50,50,0.1)'

        ctx.beginPath()
        ctx.moveTo(x11, y1)
        ctx.lineTo(x12, y1)
        ctx.lineTo(x22, y2)
        ctx.lineTo(x21, y2)
        ctx.closePath()
        ctx.fill()
      }
    })

    const imageData = await createImageBitmap(canvas)
    return {
      imageData,
      height,
      width,
    }
  }

  async render(renderProps: LinearSyntenyRenderProps) {
    const { height, width, imageData } = await this.makeImageData(renderProps)

    const element = React.createElement(
      // @ts-ignore
      this.ReactComponent,
      { ...renderProps, height, width, imageData },
      null,
    )

    return {
      element,
      imageData,
      height,
      width,
    }
  }
}
