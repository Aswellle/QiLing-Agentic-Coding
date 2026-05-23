/**
 * Bidirectional text support — adapted from CC's ink/bidi.ts
 *
 * Provides RTL/LTR detection and visual reordering for terminal output.
 * QiLing is Chinese-first (LTR), so RTL paths are minimal stubs.
 * Full RTL support (Arabic, Hebrew) would require a bidi algorithm
 * library (e.g. bidi-js) — add as a dependency if needed in Phase D.
 */

/** Unicode RTL character ranges */
const RTL_RANGES = [
  [0x0590, 0x05ff], // Hebrew
  [0x0600, 0x06ff], // Arabic
  [0x0700, 0x074f], // Syriac
  [0x0750, 0x077f], // Arabic Supplement
  [0x08a0, 0x08ff], // Arabic Extended-A
  [0xfb1d, 0xfb4f], // Hebrew Presentation Forms
  [0xfb50, 0xfdff], // Arabic Presentation Forms-A
  [0xfe70, 0xfeff], // Arabic Presentation Forms-B
  [0x10800, 0x1083f], // Cypriot Syllabary
  [0x10840, 0x1085f], // Imperial Aramaic
] as const

export type BidiDirection = 'ltr' | 'rtl' | 'neutral'

/**
 * Detect the base paragraph direction of a string.
 * Returns 'ltr' for CJK/Latin, 'rtl' for Arabic/Hebrew, 'neutral' for symbols/numbers.
 */
export function detectDirection(text: string): BidiDirection {
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    for (const [lo, hi] of RTL_RANGES) {
      if (code >= lo && code <= hi) return 'rtl'
    }
    // Strong LTR: Latin, CJK, Hangul, etc.
    if ((code >= 0x0041 && code <= 0x007a) ||  // A-z
        (code >= 0x4e00 && code <= 0x9fff) ||  // CJK Unified
        (code >= 0x3040 && code <= 0x30ff) ||  // Hiragana/Katakana
        (code >= 0xac00 && code <= 0xd7af)) {  // Hangul
      return 'ltr'
    }
  }
  return 'neutral'
}

/**
 * Returns true if the string contains any RTL characters.
 */
export function hasBidiText(text: string): boolean {
  return detectDirection(text) === 'rtl'
}

/**
 * Visually reorder a line of text for display.
 * For LTR/neutral content (the common case in QiLing) this is a no-op.
 * RTL content is reversed as a minimal approximation; Phase D should
 * use a proper Unicode Bidi Algorithm implementation.
 */
export function reorderLine(text: string, baseDir: BidiDirection = 'ltr'): string {
  if (baseDir === 'ltr' && !hasBidiText(text)) return text
  if (detectDirection(text) === 'rtl') {
    return [...text].reverse().join('')
  }
  return text
}

/**
 * Split text into bidi runs (contiguous segments of the same direction).
 * Minimal implementation: treats each character as its own run only if
 * direction changes. Returns runs suitable for per-segment rendering.
 */
export type BidiRun = { text: string; direction: BidiDirection }

export function splitBidiRuns(text: string): BidiRun[] {
  if (!text) return []
  const runs: BidiRun[] = []
  let current = ''
  let currentDir: BidiDirection = 'ltr'

  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    let dir: BidiDirection = 'neutral'
    for (const [lo, hi] of RTL_RANGES) {
      if (code >= lo && code <= hi) { dir = 'rtl'; break }
    }
    if (dir === 'neutral') dir = currentDir

    if (dir !== currentDir && current.length > 0) {
      runs.push({ text: current, direction: currentDir })
      current = ''
    }
    currentDir = dir
    current += ch
  }
  if (current) runs.push({ text: current, direction: currentDir })
  return runs
}
