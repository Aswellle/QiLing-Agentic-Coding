/**
 * Merge commands hook — adapted from CC's hooks/useMergedCommands.ts
 *
 * Deduplicates commands by name and merges MCP commands into the base set.
 * Returns the original array unchanged when no MCP commands are present (stable ref).
 */

import { useMemo } from 'react'
import type { Command } from '../commands/index.js'

export function useMergedCommands(
  initialCommands: Command[],
  mcpCommands: Command[],
): Command[] {
  return useMemo(() => {
    if (mcpCommands.length > 0) {
      const seen = new Set<string>()
      const merged = [...initialCommands, ...mcpCommands].filter(cmd => {
        const name = typeof cmd.name === 'string' ? cmd.name : String(cmd.name)
        if (seen.has(name)) return false
        seen.add(name)
        return true
      })
      return merged
    }
    return initialCommands
  }, [initialCommands, mcpCommands])
}
