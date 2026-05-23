/**
 * Text — adapted from CC's ink/components/Text.tsx
 *
 * Re-exports Ink 5's Text with the same interface used throughout CC.
 * Ink 5 Text already supports all CC props (color, bold, dim, italic,
 * underline, inverse, strikethrough, wrap, trimEnd).
 *
 * improved: No fork of Text internals needed — pass-through adapter.
 */

export { Text as default, Text } from 'ink'
export type { TextProps } from 'ink'
