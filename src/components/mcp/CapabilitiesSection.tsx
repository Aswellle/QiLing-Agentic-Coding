/**
 * MCP Capabilities Section — adapted from CC's components/mcp/CapabilitiesSection.tsx
 *
 * Shows which capabilities (tools/resources/prompts) an MCP server provides.
 */

import React from 'react'
import { Box, Text } from 'ink'
import { Byline } from '../design-system/Byline.js'

type Props = {
  serverToolsCount: number
  serverPromptsCount: number
  serverResourcesCount: number
}

export function CapabilitiesSection({ serverToolsCount, serverPromptsCount, serverResourcesCount }: Props): React.ReactNode {
  const capabilities: React.ReactNode[] = []
  if (serverToolsCount > 0) capabilities.push('tools')
  if (serverResourcesCount > 0) capabilities.push('resources')
  if (serverPromptsCount > 0) capabilities.push('prompts')

  return (
    <Box>
      <Text bold>Capabilities: </Text>
      <Text>{capabilities.length > 0 ? <Byline>{capabilities}</Byline> : 'none'}</Text>
    </Box>
  )
}
