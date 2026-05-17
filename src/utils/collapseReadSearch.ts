/**
 * Tool call collapse/grouping utilities — adapted from CC's utils/collapseReadSearch.ts
 *
 * Classifies tool calls as "read" or "search" operations that can be
 * collapsed into groups in the UI to reduce noise. Also provides utilities
 * for summarizing recent tool activity for the status bar / /context command.
 *
 * CC's full implementation uses message rendering state machines (RenderableMessage etc.).
 * QiLing adaptation: focuses on the classification and summary functions
 * that are useful for display and session notes.
 */

// ─── Tool name constants ──────────────────────────────────────────────────────

const READ_TOOLS = new Set([
  'FileRead', 'NotebookRead', 'RepoMap',
  'ListMcpResources', 'ReadMcpResource',
])

const SEARCH_TOOLS = new Set([
  'Glob', 'Grep', 'WebSearch', 'WebFetch',
  'ToolSearch',
])

const WRITE_TOOLS = new Set([
  'FileEdit', 'FileWrite', 'NotebookEdit',
])

const SHELL_TOOLS = new Set([
  'Bash', 'PowerShell',
])

// ─── Classification ───────────────────────────────────────────────────────────

export type ToolCallCategory =
  | 'read'
  | 'search'
  | 'write'
  | 'shell'
  | 'agent'
  | 'mcp'
  | 'other'

/**
 * Classify a tool call by category.
 * Used for collapsing related tool calls in the UI.
 */
export function classifyToolCall(toolName: string): ToolCallCategory {
  if (READ_TOOLS.has(toolName)) return 'read'
  if (SEARCH_TOOLS.has(toolName)) return 'search'
  if (WRITE_TOOLS.has(toolName)) return 'write'
  if (SHELL_TOOLS.has(toolName)) return 'shell'
  if (toolName === 'Agent') return 'agent'
  if (toolName.startsWith('mcp__')) return 'mcp'
  return 'other'
}

/**
 * Check if a tool call is collapsible (can be merged with adjacent similar calls).
 */
export function isToolCallCollapsible(toolName: string): boolean {
  const cat = classifyToolCall(toolName)
  return cat === 'read' || cat === 'search'
}

export type SearchOrReadResult = {
  isCollapsible: boolean
  isSearch: boolean
  isRead: boolean
  isList: boolean
  isWrite: boolean
  isShell: boolean
  isAgent: boolean
  isMcp: boolean
}

/**
 * Get detailed classification for a tool call.
 */
export function getToolSearchOrReadInfo(toolName: string): SearchOrReadResult {
  const cat = classifyToolCall(toolName)
  return {
    isCollapsible: cat === 'read' || cat === 'search',
    isSearch: cat === 'search',
    isRead: cat === 'read',
    isList: toolName === 'Glob' || toolName === 'ListMcpResources',
    isWrite: cat === 'write',
    isShell: cat === 'shell',
    isAgent: cat === 'agent',
    isMcp: cat === 'mcp',
  }
}

// ─── Activity summarization ───────────────────────────────────────────────────

export type ToolCallRecord = {
  toolName: string
  input?: unknown
  output?: string
  durationMs?: number
}

/**
 * Summarize a list of tool calls into a human-readable string.
 * Used by SessionMemory and the status bar.
 *
 * @example
 * summarizeToolActivity([{ toolName: 'FileRead' }, { toolName: 'FileEdit' }])
 * // → "Read 1 file, edited 1 file"
 */
export function summarizeToolActivity(calls: ToolCallRecord[]): string {
  const counts: Record<ToolCallCategory, number> = {
    read: 0, search: 0, write: 0, shell: 0, agent: 0, mcp: 0, other: 0,
  }

  for (const { toolName } of calls) {
    counts[classifyToolCall(toolName)]++
  }

  const parts: string[] = []
  if (counts.read > 0) parts.push(`read ${counts.read} file${counts.read > 1 ? 's' : ''}`)
  if (counts.search > 0) parts.push(`searched ${counts.search} time${counts.search > 1 ? 's' : ''}`)
  if (counts.write > 0) parts.push(`edited ${counts.write} file${counts.write > 1 ? 's' : ''}`)
  if (counts.shell > 0) parts.push(`ran ${counts.shell} command${counts.shell > 1 ? 's' : ''}`)
  if (counts.agent > 0) parts.push(`spawned ${counts.agent} agent${counts.agent > 1 ? 's' : ''}`)
  if (counts.mcp > 0) parts.push(`called ${counts.mcp} MCP tool${counts.mcp > 1 ? 's' : ''}`)

  if (parts.length === 0) return 'no tool calls'
  return parts.join(', ')
}

/**
 * Group consecutive tool calls of the same category.
 * Used for compressing the tool call display in verbose mode.
 */
export function groupToolCalls(
  calls: ToolCallRecord[],
): Array<{ category: ToolCallCategory; count: number; tools: string[] }> {
  const groups: Array<{ category: ToolCallCategory; count: number; tools: string[] }> = []

  for (const { toolName } of calls) {
    const cat = classifyToolCall(toolName)
    const last = groups[groups.length - 1]
    if (last && last.category === cat) {
      last.count++
      if (!last.tools.includes(toolName)) last.tools.push(toolName)
    } else {
      groups.push({ category: cat, count: 1, tools: [toolName] })
    }
  }

  return groups
}

/**
 * Get a compact one-line summary of recent tool activity.
 * Similar to CC's getSearchReadSummaryText().
 */
export function getSearchReadSummaryText(toolNames: string[]): string {
  const reads = toolNames.filter(n => READ_TOOLS.has(n)).length
  const searches = toolNames.filter(n => SEARCH_TOOLS.has(n)).length
  const writes = toolNames.filter(n => WRITE_TOOLS.has(n)).length
  const shells = toolNames.filter(n => SHELL_TOOLS.has(n)).length

  const parts: string[] = []
  if (searches > 0) parts.push(`${searches} search${searches > 1 ? 'es' : ''}`)
  if (reads > 0) parts.push(`${reads} read${reads > 1 ? 's' : ''}`)
  if (writes > 0) parts.push(`${writes} write${writes > 1 ? 's' : ''}`)
  if (shells > 0) parts.push(`${shells} shell`)

  return parts.join(', ') || ''
}
