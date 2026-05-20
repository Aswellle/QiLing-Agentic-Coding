/**
 * IDE at-mention hook — adapted from CC's hooks/useIdeAtMentioned.ts
 *
 * Tracks IDE @-mention notifications via MCP client notification handlers.
 * Calls onAtMentioned with file path and optional line range when triggered.
 */

import { useEffect, useRef } from 'react'
import { z } from 'zod/v4'
import type { ConnectedMCPServer, MCPServerConnection } from '../services/mcp/types.js'
import { lazySchema } from '../utils/lazySchema.js'
import { logError } from '../utils/log.js'

export type IDEAtMentioned = {
  filePath: string
  lineStart?: number
  lineEnd?: number
}

const NOTIFICATION_METHOD = 'at_mentioned'

const AtMentionedSchema = lazySchema(() =>
  z.object({
    method: z.literal(NOTIFICATION_METHOD),
    params: z.object({
      filePath: z.string(),
      lineStart: z.number().optional(),
      lineEnd: z.number().optional(),
    }),
  }),
)

function getConnectedIdeClient(clients: MCPServerConnection[]): ConnectedMCPServer | undefined {
  return clients.find(c => c.name === 'ide' && c.type === 'connected') as ConnectedMCPServer | undefined
}

export function useIdeAtMentioned(
  mcpClients: MCPServerConnection[],
  onAtMentioned: (atMentioned: IDEAtMentioned) => void,
): void {
  const ideClientRef = useRef<ConnectedMCPServer | undefined>(undefined)

  useEffect(() => {
    const ideClient = getConnectedIdeClient(mcpClients)
    if (ideClientRef.current !== ideClient) ideClientRef.current = ideClient

    if (ideClient) {
      ideClient.client.setNotificationHandler(AtMentionedSchema(), notification => {
        if (ideClientRef.current !== ideClient) return
        try {
          const data = notification.params
          onAtMentioned({
            filePath: data.filePath,
            lineStart: data.lineStart !== undefined ? data.lineStart + 1 : undefined,
            lineEnd: data.lineEnd !== undefined ? data.lineEnd + 1 : undefined,
          })
        } catch (error) { logError(error as Error) }
      })
    }
  }, [mcpClients, onAtMentioned])
}
