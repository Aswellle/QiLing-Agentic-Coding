/**
 * Tool pool utilities — adapted from CC's utils/toolPool.ts
 *
 * Merges built-in and MCP tool arrays, deduplicates, applies coordinator mode
 * filtering. React-free so print.ts can import without pulling in ink/react.
 *
 * mergeAndFilterTools() is the main entry point:
 * - Deduplicates by name (initialTools take precedence)
 * - Sorts for prompt-cache stability: builtins prefix, then MCP
 * - Applies coordinator mode filter when COORDINATOR_MODE is active
 */

import type { Tool } from '../types/tool.js'
import { COORDINATOR_MODE_ALLOWED_TOOLS } from '../constants/tools.js'
import { isMcpTool } from '../services/mcp/mcpStringUtils.js'

type Tools = Tool[]

// MCP tool name suffixes for PR activity subscription tools.
// These orchestration tools are always allowed in coordinator mode.
const PR_ACTIVITY_TOOL_SUFFIXES = ['subscribe_pr_activity', 'unsubscribe_pr_activity']

export function isPrActivitySubscriptionTool(name: string): boolean {
  return PR_ACTIVITY_TOOL_SUFFIXES.some(suffix => name.endsWith(suffix))
}

/**
 * Filter tools to those allowed in coordinator mode.
 */
export function applyCoordinatorToolFilter(tools: Tools): Tools {
  return tools.filter(
    t => COORDINATOR_MODE_ALLOWED_TOOLS.has(t.name) || isPrActivitySubscriptionTool(t.name),
  )
}

/**
 * Merge, deduplicate, and optionally coordinator-filter tool arrays.
 *
 * @param initialTools  Extra tools (built-in + startup MCP from props), take precedence
 * @param assembled     Tools from assembleToolPool (built-in + MCP, deduped)
 * @returns Merged and deduplicated tool array, sorted for cache stability
 */
export function mergeAndFilterTools(
  initialTools: Tools,
  assembled: Tools,
): Tools {
  // Deduplicate: initialTools first so they win on name conflicts
  const seen = new Set<string>()
  const merged: Tools = []
  for (const tool of [...initialTools, ...assembled]) {
    if (!seen.has(tool.name)) {
      seen.add(tool.name)
      merged.push(tool)
    }
  }

  // Partition-sort: built-ins prefix (cache stability), MCP suffix
  const builtIn: Tools = []
  const mcp: Tools = []
  for (const t of merged) {
    if (isMcpTool(t as { name: string })) mcp.push(t)
    else builtIn.push(t)
  }

  const byName = (a: Tool, b: Tool) => a.name.localeCompare(b.name)
  const tools = [...builtIn.sort(byName), ...mcp.sort(byName)]

  // Apply coordinator mode filter if active
  if (process.env.QILING_COORDINATOR_MODE === '1') {
    return applyCoordinatorToolFilter(tools)
  }

  return tools
}
