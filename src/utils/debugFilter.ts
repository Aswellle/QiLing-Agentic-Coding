/**
 * Debug log filtering — adapted from CC's utils/debugFilter.ts
 *
 * Parses QILING_DEBUG_FILTER (CC: CLAUDE_CODE_DEBUG_FILTER) to filter debug
 * messages by category:
 *   "api,hooks"   → include only those categories
 *   "!1p,!file"   → exclude those categories
 *   (empty)       → show everything
 *
 * Categories are extracted from message patterns like:
 *   "api: request started" → ["api"]
 *   "[MCP] connected"      → ["mcp"]
 *   'MCP server "name": error' → ["mcp", "name"]
 */

export type DebugFilter = {
  include: string[]
  exclude: string[]
  isExclusive: boolean
}

let _parsed: Map<string, DebugFilter | null> = new Map()

/**
 * Parse a debug filter string into a filter configuration.
 * Memoized — same string always returns same object.
 */
export function parseDebugFilter(filterString?: string): DebugFilter | null {
  const key = filterString ?? ''
  if (_parsed.has(key)) return _parsed.get(key)!

  if (!filterString || !filterString.trim()) {
    _parsed.set(key, null)
    return null
  }

  const filters = filterString.split(',').map(f => f.trim()).filter(Boolean)
  if (filters.length === 0) {
    _parsed.set(key, null)
    return null
  }

  const hasExclusive = filters.some(f => f.startsWith('!'))
  const hasInclusive = filters.some(f => !f.startsWith('!'))

  // Mixed inclusive/exclusive: ambiguous, show all
  if (hasExclusive && hasInclusive) {
    _parsed.set(key, null)
    return null
  }

  const cleanFilters = filters.map(f => f.replace(/^!/, '').toLowerCase())
  const result: DebugFilter = {
    include: hasExclusive ? [] : cleanFilters,
    exclude: hasExclusive ? cleanFilters : [],
    isExclusive: hasExclusive,
  }
  _parsed.set(key, result)
  return result
}

/**
 * Extract debug categories from a message string.
 * Supports "category: message", "[CATEGORY] message", MCP server names, etc.
 */
export function extractDebugCategories(message: string): string[] {
  const categories: string[] = []

  // "category: message" pattern
  const colonMatch = message.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s/)
  if (colonMatch && colonMatch[1]) {
    categories.push(colonMatch[1].toLowerCase())
  }

  // MCP server name pattern: 'MCP server "name": ...'
  const mcpMatch = message.match(/^MCP server "([^"]+)"/)
  if (mcpMatch && mcpMatch[1]) {
    categories.push('mcp')
    categories.push(mcpMatch[1].toLowerCase())
  }

  // "[CATEGORY]" bracket pattern
  const bracketMatch = message.match(/^\[([^\]]+)]/)
  if (bracketMatch && bracketMatch[1]) {
    categories.push(bracketMatch[1].trim().toLowerCase())
  }

  // "1P event:" pattern
  if (message.toLowerCase().includes('1p event:')) {
    categories.push('1p')
  }

  // Secondary category after "Type: X:" or similar
  const secondaryMatch = message.match(
    /:\s*([^:]+?)(?:\s+(?:type|mode|status|event))?:/,
  )
  if (secondaryMatch && secondaryMatch[1]) {
    const secondary = secondaryMatch[1].trim().toLowerCase()
    if (secondary.length < 30 && !secondary.includes(' ')) {
      categories.push(secondary)
    }
  }

  return Array.from(new Set(categories))
}

/**
 * Check if categories pass the filter.
 */
export function shouldShowDebugCategories(
  categories: string[],
  filter: DebugFilter | null,
): boolean {
  if (!filter) return true
  if (categories.length === 0) return false

  if (filter.isExclusive) {
    return !categories.some(cat => filter.exclude.includes(cat))
  }
  return categories.some(cat => filter.include.includes(cat))
}

/**
 * Main entry point: should this debug message be shown?
 */
export function shouldShowDebugMessage(
  message: string,
  filter: DebugFilter | null,
): boolean {
  if (!filter) return true
  return shouldShowDebugCategories(extractDebugCategories(message), filter)
}

/** @internal — reset memo cache for tests */
export function _resetDebugFilterCacheForTesting(): void {
  _parsed = new Map()
}
