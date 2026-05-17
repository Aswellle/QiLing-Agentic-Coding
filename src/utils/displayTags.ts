/**
 * Display tag stripping — direct port of CC's utils/displayTags.ts
 *
 * Strips XML-like system-injected tag blocks from text for use in
 * UI titles, /rewind previews, and session display names.
 *
 * Examples of tags that get stripped:
 *   <system-reminder>…</system-reminder>
 *   <task-notification>…</task-notification>
 *   <local-command-caveat>…</local-command-caveat>
 */

const XML_TAG_BLOCK_PATTERN = /<([a-z][\w-]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>\n?/g

/**
 * Strip XML-like tag blocks from text for display titles.
 * Returns original text if stripping would result in empty string.
 */
export function stripDisplayTags(text: string): string {
  const result = text.replace(XML_TAG_BLOCK_PATTERN, '').trim()
  return result || text
}

/**
 * Like stripDisplayTags but returns empty string when all content is tags.
 * Used to detect command-only messages (e.g. /clear) for fallback handling.
 */
export function stripDisplayTagsAllowEmpty(text: string): string {
  return text.replace(XML_TAG_BLOCK_PATTERN, '').trim()
}

/**
 * Extract the first meaningful line of text from a user message,
 * stripping system tags and metadata for display.
 *
 * Used by /rename auto-generation and session list display.
 */
export function extractDisplayTitle(text: string, maxLength = 60): string {
  const stripped = stripDisplayTagsAllowEmpty(text)
  if (!stripped) return ''

  // Take first line only
  const firstLine = stripped.split('\n')[0]?.trim() ?? ''
  if (!firstLine) return ''

  return firstLine.length > maxLength
    ? firstLine.slice(0, maxLength - 1) + '…'
    : firstLine
}
