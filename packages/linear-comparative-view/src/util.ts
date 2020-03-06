import { clamp } from '@gmod/jbrowse-core/util'
import { LayoutRecord } from './LinearComparativeView/model'
import { ReducedLinearGenomeViewModel } from './LinearSyntenyRenderer/LinearSyntenyRenderer'

const [, TOP, , BOTTOM] = [0, 1, 2, 3]

export function cheight(chunk: LayoutRecord) {
  return chunk[BOTTOM] - chunk[TOP]
}
function heightFromSpecificLevel(
  views: ReducedLinearGenomeViewModel[],
  trackConfigId: string,
  level: number,
) {
  const heightUpUntilThisPoint = views
    .slice(0, level)
    .map(v => v.height + 7)
    .reduce((a, b) => a + b, 0)
  return (
    heightUpUntilThisPoint +
    views[level].headerHeight +
    views[level].scaleBarHeight +
    getTrackPos(views[level], trackConfigId) +
    1
  )
}

export function getTrackPos(
  view: ReducedLinearGenomeViewModel,
  trackConfigId: string,
) {
  const idx = view.tracks.findIndex(t => t.trackId === trackConfigId)
  let accum = 0
  for (let i = 0; i < idx; i += 1) {
    accum += view.tracks[i].height + 3 // +1px for trackresizehandle
  }
  return accum
}

// uses bpToPx to get the screen pixel coordinates but ignores some error conditions
// where bpToPx could return undefined
export function getPxFromCoordinate(
  view: ReducedLinearGenomeViewModel,
  refName: string,
  coord: number,
) {
  return (
    ((bpToPx(view, { refName, coord }) || {}).offsetPx || 0) - view.offsetPx
  )
}

// get's the yposition of a layout record in a track
// if track not found returns 0
export function yPos(
  trackConfigId: string,
  level: number,
  views: ReducedLinearGenomeViewModel[],
  c: LayoutRecord,
) {
  const view = views[level]
  const track = view.tracks.find(t => t.trackId === trackConfigId)
  return track
    ? clamp(c[TOP] - track.scrollTop, 0, track.height) +
        heightFromSpecificLevel(views, trackConfigId, level)
    : 0
}

// returns the pixel screen position of a refName:coord input or undefined if
// the input could not be located. uses the view.staticBlocks as a representation
// of what is on the screen
//
// note: does not consider that this refName:coord input could multi-match
function bpToPx(
  view: ReducedLinearGenomeViewModel,
  { refName, coord }: { refName: string; coord: number },
) {
  let offsetBp = 0

  const index = view.staticBlocks.findIndex(r => {
    if (refName === r.refName && coord >= r.start && coord <= r.end) {
      offsetBp += view.reversed ? r.end - coord : coord - r.start
      return true
    }
    offsetBp += r.end - r.start
    return false
  })
  const foundRegion = view.staticBlocks[index]
  if (foundRegion) {
    return {
      index,
      offsetPx: Math.round(offsetBp / view.bpPerPx),
    }
  }
  return undefined
}
