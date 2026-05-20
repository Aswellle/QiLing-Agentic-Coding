/**
 * MCP Server dialog copy text — adapted from CC's components/MCPServerDialogCopy.tsx
 *
 * Standard disclosure text about MCP server permissions, shown in permission dialogs.
 */

import React from 'react'
import { Text } from 'ink'
import Link from '../ink/components/Link.js'

export function MCPServerDialogCopy(): React.ReactNode {
  return (
    <Text>
      MCP servers may execute code or access system resources. All tool calls
      require approval. Learn more in the{' '}
      <Link url="https://code.claude.com/docs/en/mcp">MCP documentation</Link>.
    </Text>
  )
}
