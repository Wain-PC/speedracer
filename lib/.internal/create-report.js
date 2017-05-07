// Packages
const DevtoolsTimelineModel = require('devtools-timeline-model')

// Ours
const { freqOf, minOf, maxOf, round, varOf } = require('./.internal/stats')
const {
  extractFrames,
  dumpTree,
  toSec
} = require('./.internal/trace')

const { sqrt } = Math

const analyzeByCategories = model =>
dumpTree(model.bottomUpGroupBy('Category'), 'totalTime')

const analyzeByEvents = model =>
dumpTree(model.bottomUpGroupBy('EventName'), 'totalTime')

const analyzeFunctions = model =>
dumpTree(model.bottomUp(), 'selfTime')

const analyzeFirstPaint = events => {
  const firstPaint = events.find(e => e.name === 'firstPaint')
  if (!firstPaint) return null

  const first = events.find(e => e.name === 'TracingStartedInPage')
  return toSec(firstPaint.ts - first.ts)
}

const analyzeFps = frames => {
  if (frames.length === 0) return null

  frames = frames.map(f => toSec(f.ts))
  const fpsPerFrames = frames.reduce((fpsPerFrames, f, i, frames) => {
    if (i > 0) {
      const fps = 1 / (f - frames[i - 1])
      fpsPerFrames.push(fps)
    }
    return fpsPerFrames
  }, [])

  // Compute min
  const lo = round(minOf(fpsPerFrames), 2)
  // Compute max
  const hi = round(maxOf(fpsPerFrames), 2)
  // Compute mean
  const mean = round(freqOf(frames), 2)
  // Compute variance
  const variance = round(varOf(fpsPerFrames, mean), 2)
  // Compute standard deviation
  const sd = round(sqrt(variance), 2)

  return { mean, variance, sd, lo, hi }
}

const createReport = (meta, trace) =>
new Promise(resolve => {
  const model = new DevtoolsTimelineModel(trace.events)

  const report = {
    meta,
    profiling: {
      categories: analyzeByCategories(model),
      events: analyzeByEvents(model),
      functions: analyzeFunctions(model)
    },
    firstPaint: analyzeFirstPaint(trace.events),
    fps: analyzeFps(extractFrames(trace.events))
  }
  resolve(report)
})

module.exports = createReport