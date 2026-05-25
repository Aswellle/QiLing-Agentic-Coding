/**
 * Spinner component exports — adapted from CC's components/Spinner/index.ts
 */

// FROM CC: added missing re-exports for FlashingChar/SpinnerGlyph/GlimmerMessage/useShimmerAnimation/useStalledAnimation
export { FlashingChar } from './FlashingChar.js'
export { GlimmerMessage } from './GlimmerMessage.js'
export { ShimmerChar } from './ShimmerChar.js'
export { SpinnerGlyph } from './SpinnerGlyph.js'
export type { SpinnerMode, RGBColor } from './types.js'
export { useShimmerAnimation } from './useShimmerAnimation.js'
export { useStalledAnimation } from './useStalledAnimation.js'
export {
  getDefaultCharacters,
  interpolateColor,
  parseRGB,
  toRGBColor,
  hueToRgb,
} from './utils.js'
// Teammate components are NOT exported here - use dynamic require() to enable dead code elimination
// See REPL.tsx and Spinner.tsx for the correct import pattern
