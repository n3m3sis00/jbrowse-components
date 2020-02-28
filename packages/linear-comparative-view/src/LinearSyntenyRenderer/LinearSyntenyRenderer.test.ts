import PrecomputedLayout from '@gmod/jbrowse-core/util/layouts/PrecomputedLayout'
import SimpleFeature from '@gmod/jbrowse-core/util/simpleFeature'
import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'
// @ts-ignore
import { toMatchImageSnapshot } from 'jest-image-snapshot'
import LinearSyntenyRenderer, { LayoutTuple } from './LinearSyntenyRenderer'
import configSchema from './configSchema'

const fs = require('fs')

expect.extend({ toMatchImageSnapshot })

// these tests do very little, let's try to expand them at some point
test('test rendering a simple synteny from fake data', async () => {
  const renderer = new LinearSyntenyRenderer({
    ReactComponent: () => null,
    name: 'LinearSyntenyRenderer',
    configSchema,
  })
  // const { container } = render(
  //   <LinearSyntenyRenderer
  //     width={500}
  //     height={500}
  //     region={{ refName: 'zonk', start: 1, end: 3 }}
  //     layout={new PrecomputedLayout({ rectangles: {}, totalHeight: 20 })}
  //     bpPerPx={3}
  //   />,
  // )
  //
  const result = await renderer.render({
    width: 800,
    height: 600,
    config: {},
    horizontallyFlipped: false,
    highResolutionScaling: 1,
    trackIds: ['peach_gene', 'grape_gene'],
    views: [
      {
        offsetPx: 0,
        bpPerPx: 1,
        staticBlocks: [
          { assemblyName: 'hg38', refName: 'chr1', start: 0, end: 999 },
        ],
        dynamicBlocks: [],
        height: 100,
        reversed: false,
        tracks: [],
        headerHeight: 10,
        scaleBarHeight: 32,
      },
      {
        offsetPx: 0,
        bpPerPx: 1,
        staticBlocks: [
          { assemblyName: 'mm10', refName: 'chr1', start: 0, end: 999 },
        ],
        dynamicBlocks: [],
        height: 100,
        tracks: [],
        reversed: false,
        headerHeight: 10,
        scaleBarHeight: 32,
      },
    ],
    layoutMatches: [
      [
        {
          level: 0,
          refName: 'chr1',
          layout: [0, 0, 100, 10] as LayoutTuple,
          feature: new SimpleFeature({
            id: 1,
            data: { start: 100, end: 200, refName: 'chr1' },
          }),
        },
        {
          level: 1,
          refName: 'chr1',
          layout: [900, 0, 999, 10] as LayoutTuple,
          feature: new SimpleFeature({
            id: 2,
            data: { start: 900, end: 1000, refName: 'chr1' },
          }),
        },
      ],
    ],
  })
  const r = await result.imageData

  const data = r.src.replace(/^data:image\/\w+;base64,/, '')
  const buf = Buffer.from(data, 'base64')
  fs.writeFileSync('/home/cdiesh/out.png', buf)
  // this is needed to do a fuzzy image comparison because
  // the travis-ci was 2 pixels different for some reason, see PR #710
  // @ts-ignore
  expect(buf).toMatchImageSnapshot()
})