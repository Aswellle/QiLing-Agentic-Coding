/**
 * Terminal diff optimizer — adapted from CC's ink/optimizer.ts
 *
 * Single-pass optimization: merges cursorMoves, dedupes hyperlinks,
 * cancels cursor hide/show pairs, removes no-ops and empty patches.
 */

type Patch =
  | { type: 'stdout'; content: string }
  | { type: 'cursorMove'; x: number; y: number }
  | { type: 'cursorTo'; x: number; y: number }
  | { type: 'styleStr'; str: string }
  | { type: 'hyperlink'; uri: string }
  | { type: 'cursorHide' }
  | { type: 'cursorShow' }
  | { type: 'clear'; count: number }
  | { type: string; [k: string]: unknown }

export type Diff = Patch[]

export function optimize(diff: Diff): Diff {
  if (diff.length <= 1) return diff

  const result: Diff = []
  let len = 0

  for (const patch of diff) {
    const type = patch.type

    if (type === 'stdout' && (patch as { content: string }).content === '') continue
    if (type === 'cursorMove' && (patch as { x: number; y: number }).x === 0 && (patch as { x: number; y: number }).y === 0) continue
    if (type === 'clear' && (patch as { count: number }).count === 0) continue

    if (len > 0) {
      const lastIdx = len - 1
      const last = result[lastIdx]!
      const lastType = last.type

      if (type === 'cursorMove' && lastType === 'cursorMove') {
        result[lastIdx] = { type: 'cursorMove', x: (last as { x: number }).x + (patch as { x: number }).x, y: (last as { y: number }).y + (patch as { y: number }).y }
        continue
      }
      if (type === 'cursorTo' && lastType === 'cursorTo') { result[lastIdx] = patch; continue }
      if (type === 'styleStr' && lastType === 'styleStr') {
        result[lastIdx] = { type: 'styleStr', str: (last as { str: string }).str + (patch as { str: string }).str }
        continue
      }
      if (type === 'hyperlink' && lastType === 'hyperlink' && (patch as { uri: string }).uri === (last as { uri: string }).uri) continue
      if ((type === 'cursorShow' && lastType === 'cursorHide') || (type === 'cursorHide' && lastType === 'cursorShow')) {
        result.pop(); len--; continue
      }
    }

    result.push(patch)
    len++
  }

  return result
}
