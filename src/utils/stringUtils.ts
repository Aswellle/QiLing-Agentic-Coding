/**
 * General string utility functions — ported from CC's utils/stringUtils.ts
 */

/** Escapes special regex characters so a string can be used as a literal RegExp pattern. */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Uppercases the first character, leaving the rest unchanged.
 * Unlike lodash capitalize, does NOT lowercase the remaining chars.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Returns the singular or plural form of a word based on count.
 * @example plural(1, 'file') → 'file'; plural(3, 'file') → 'files'
 */
export function plural(n: number, word: string, pluralWord = word + 's'): string {
  return n === 1 ? word : pluralWord
}

/** Returns the first line of a string without allocating a split array. */
export function firstLineOf(s: string): string {
  const nl = s.indexOf('\n')
  return nl === -1 ? s : s.slice(0, nl)
}

/**
 * Counts occurrences of `char` in `str` using indexOf jumps.
 * Structurally typed so Buffer works too.
 */
export function countCharInString(
  str: { indexOf(search: string, start?: number): number },
  char: string,
  start = 0,
): number {
  let count = 0
  let i = str.indexOf(char, start)
  while (i !== -1) {
    count++
    i = str.indexOf(char, i + 1)
  }
  return count
}

/** Normalize full-width (zenkaku) digits to half-width. */
export function normalizeFullWidthDigits(input: string): string {
  return input.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
}

/** Normalize full-width space (U+3000) to half-width space. */
export function normalizeFullWidthSpace(input: string): string {
  return input.replace(/　/g, ' ')
}

const MAX_STRING_LENGTH = 2 ** 25

/**
 * Safely joins an array of strings with a delimiter, truncating if result exceeds maxSize.
 */
export function safeJoinLines(
  lines: string[],
  delimiter = ',',
  maxSize = MAX_STRING_LENGTH,
): string {
  const truncationMarker = '...[truncated]'
  let result = ''
  for (const line of lines) {
    const delimiterToAdd = result ? delimiter : ''
    const fullAddition = delimiterToAdd + line
    if (result.length + fullAddition.length <= maxSize) {
      result += fullAddition
    } else {
      const remainingSpace = maxSize - result.length - delimiterToAdd.length - truncationMarker.length
      if (remainingSpace > 0) {
        result += delimiterToAdd + line.slice(0, remainingSpace) + truncationMarker
      } else {
        result += truncationMarker
      }
      return result
    }
  }
  return result
}

/**
 * String accumulator that safely handles large outputs by truncating from the end.
 * Prevents RangeError crashes while preserving the beginning of the output.
 */
export class EndTruncatingAccumulator {
  private content = ''
  private isTruncated = false
  private totalBytesReceived = 0

  constructor(private readonly maxSize = MAX_STRING_LENGTH) {}

  append(data: string | Buffer): void {
    const str = typeof data === 'string' ? data : data.toString()
    this.totalBytesReceived += str.length
    if (this.isTruncated && this.content.length >= this.maxSize) return
    if (this.content.length + str.length > this.maxSize) {
      const remainingSpace = this.maxSize - this.content.length
      if (remainingSpace > 0) this.content += str.slice(0, remainingSpace)
      this.isTruncated = true
    } else {
      this.content += str
    }
  }

  toString(): string {
    if (!this.isTruncated) return this.content
    const truncatedKB = Math.round((this.totalBytesReceived - this.maxSize) / 1024)
    return this.content + `\n... [output truncated - ${truncatedKB}KB removed]`
  }

  clear(): void {
    this.content = ''
    this.isTruncated = false
    this.totalBytesReceived = 0
  }

  get length(): number { return this.content.length }
  get truncated(): boolean { return this.isTruncated }
  get totalBytes(): number { return this.totalBytesReceived }
}

/**
 * Truncates text to a maximum number of lines, adding an ellipsis if truncated.
 */
export function truncateToLines(text: string, maxLines: number): string {
  const lines = text.split('\n')
  if (lines.length <= maxLines) return text
  return lines.slice(0, maxLines).join('\n') + '…'
}
