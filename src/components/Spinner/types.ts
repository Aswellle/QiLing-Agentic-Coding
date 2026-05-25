/**
 * Spinner type definitions — adapted from CC's components/Spinner/types.ts
 */

// FROM CC: added 'tool-use' mode (GlimmerMessage renders all chars as single Text for perf)
export type SpinnerMode = 'requesting' | 'streaming' | 'stalled' | 'tool-use'

export type RGBColor = {
  r: number
  g: number
  b: number
}
