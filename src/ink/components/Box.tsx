/**
 * Box — adapted from CC's ink/components/Box.tsx
 *
 * Re-exports Ink 5's `Box` with the same interface as CC's internal Box.
 * CC's internal Box extends yoga layout with CC-specific border/padding
 * semantics. In QiLing we use Ink 5's Box directly (it already supports
 * borders, flex, padding) — this file is a pass-through adapter so any
 * import path targeting our internal Box resolves correctly.
 *
 * improved: No fork of Box internals needed since Ink 5 supports border
 * styling natively via `borderStyle` + `borderColor` props.
 */

export { Box as default, Box } from 'ink'
export type { BoxProps } from 'ink'
