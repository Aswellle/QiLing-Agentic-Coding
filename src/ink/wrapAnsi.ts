/**
 * ANSI-aware text wrapping — adapted from CC's ink/wrapAnsi.ts
 *
 * Uses Bun.wrapAnsi when available (~3x faster), falls back to wrap-ansi npm.
 */

type WrapAnsiOptions = { hard?: boolean; wordWrap?: boolean; trim?: boolean }

type WrapAnsiLike = (input: string, columns: number, options?: WrapAnsiOptions) => string

const wrapAnsiBun: WrapAnsiLike | null =
  typeof Bun !== 'undefined' && typeof (Bun as { wrapAnsi?: WrapAnsiLike }).wrapAnsi === 'function'
    ? (Bun as { wrapAnsi: WrapAnsiLike }).wrapAnsi
    : null

const wrapAnsi: WrapAnsiLike = wrapAnsiBun ?? ((input, columns, options) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('wrap-ansi') as WrapAnsiLike)(input, columns, options)
  } catch {
    // Fallback: naive wrap without ANSI awareness
    return input
  }
})

export { wrapAnsi }
