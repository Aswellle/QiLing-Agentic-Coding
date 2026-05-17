/**
 * Width-aware string truncation — ported from CC's utils/truncate.ts
 *
 * Uses character-level iteration for emoji/CJK safety.
 * Note: CC uses stringWidth() from ink; QiLing uses a simple approximation
 * (CJK chars count as 2, others as 1) to avoid the ink dependency in utils.
 */

/** Rough terminal display width of a string (CJK = 2, emoji ≈ 2, ASCII = 1) */
function displayWidth(str: string): number {
  let width = 0
  for (const char of str) {
    const code = char.codePointAt(0) ?? 0
    // CJK Unified Ideographs, Fullwidth, etc.
    if (
      (code >= 0x1100 && code <= 0x115f) ||  // Hangul Jamo
      (code >= 0x2e80 && code <= 0x9fff) ||  // CJK
      (code >= 0xa960 && code <= 0xa97f) ||
      (code >= 0xac00 && code <= 0xd7ff) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe1f) ||
      (code >= 0xfe30 && code <= 0xfe4f) ||
      (code >= 0xff01 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300)                       // Emoji and misc symbols
    ) {
      width += 2
    } else if (code >= 0x20) {
      width += 1
    }
    // Control chars contribute 0
  }
  return width
}

/**
 * Truncate a string to fit within maxWidth terminal columns.
 * Appends '…' when truncation occurs.
 * CJK and emoji safe.
 */
export function truncateToWidth(text: string, maxWidth: number): string {
  if (displayWidth(text) <= maxWidth) return text
  if (maxWidth <= 1) return '…'

  let width = 0
  let result = ''
  for (const char of text) {
    const cw = displayWidth(char)
    if (width + cw > maxWidth - 1) break
    result += char
    width += cw
  }
  return result + '…'
}

/**
 * Truncate from the start of a string, keeping the tail.
 * Prepends '…' when truncation occurs.
 */
export function truncateStartToWidth(text: string, maxWidth: number): string {
  if (displayWidth(text) <= maxWidth) return text
  if (maxWidth <= 1) return '…'

  const chars = [...text]
  let width = 0
  let startIdx = chars.length

  for (let i = chars.length - 1; i >= 0; i--) {
    const cw = displayWidth(chars[i]!)
    if (width + cw > maxWidth - 1) break
    width += cw
    startIdx = i
  }

  return '…' + chars.slice(startIdx).join('')
}

/**
 * Truncate without appending an ellipsis.
 * Used as a building block for middle-truncation.
 */
export function truncateToWidthNoEllipsis(text: string, maxWidth: number): string {
  if (displayWidth(text) <= maxWidth) return text
  if (maxWidth <= 0) return ''

  let width = 0
  let result = ''
  for (const char of text) {
    const cw = displayWidth(char)
    if (width + cw > maxWidth) break
    result += char
    width += cw
  }
  return result
}

/**
 * Truncate a file path in the middle, preserving both the directory prefix
 * and the filename suffix.
 *
 * Example: "src/components/deeply/nested/MyComponent.tsx" → "src/components/…/MyComponent.tsx"
 */
export function truncatePathMiddle(path: string, maxLength: number): string {
  if (displayWidth(path) <= maxLength) return path
  if (maxLength <= 0) return '…'
  if (maxLength < 5) return truncateToWidth(path, maxLength)

  const lastSlash = path.lastIndexOf('/')
  const filename = lastSlash >= 0 ? path.slice(lastSlash) : path
  const directory = lastSlash >= 0 ? path.slice(0, lastSlash) : ''
  const filenameWidth = displayWidth(filename)

  if (filenameWidth >= maxLength - 1) {
    return truncateStartToWidth(path, maxLength)
  }

  const availableForDir = maxLength - 1 - filenameWidth // -1 for '…'
  if (availableForDir <= 0) {
    return truncateStartToWidth(filename, maxLength)
  }

  const truncatedDir = truncateToWidthNoEllipsis(directory, availableForDir)
  return truncatedDir + '…' + filename
}

/**
 * General-purpose truncation with optional single-line enforcement.
 */
export function truncate(
  str: string,
  maxWidth: number,
  singleLine = false,
): string {
  let text = str

  if (singleLine) {
    const newlineIdx = str.indexOf('\n')
    if (newlineIdx !== -1) {
      text = str.slice(0, newlineIdx)
      if (displayWidth(text) + 1 > maxWidth) return truncateToWidth(text, maxWidth)
      return `${text}…`
    }
  }

  return displayWidth(text) <= maxWidth ? text : truncateToWidth(text, maxWidth)
}

/**
 * Word-wrap text to fit within a given width.
 * Returns an array of lines.
 */
export function wrapText(text: string, width: number): string[] {
  const lines: string[] = []
  let currentLine = ''
  let currentWidth = 0

  for (const char of text) {
    const cw = displayWidth(char)
    if (char === '\n') {
      lines.push(currentLine)
      currentLine = ''
      currentWidth = 0
    } else if (currentWidth + cw <= width) {
      currentLine += char
      currentWidth += cw
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = char
      currentWidth = cw
    }
  }

  if (currentLine) lines.push(currentLine)
  return lines
}
