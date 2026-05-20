/**
 * IDE connection status hook — adapted from CC's hooks/useIdeConnectionStatus.ts
 *
 * Returns the IDE client connection status (connected/disconnected/pending)
 * and IDE name by inspecting the 'ide' MCP server connection.
 */

import { useMemo } from 'react'
import type { MCPServerConnection } from '../services/mcp/types.js'

export type IdeStatus = 'connected' | 'disconnected' | 'pending' | null

type IdeConnectionResult = {
  status: IdeStatus
  ideName: string | null
}

export function useIdeConnectionStatus(mcpClients?: MCPServerConnection[]): IdeConnectionResult {
  return useMemo(() => {
    const ideClient = mcpClients?.find(client => client.name === 'ide')
    if (!ideClient) return { status: null, ideName: null }

    const config = ideClient.config as { type?: string; ideName?: string }
    const ideName = config.type === 'sse-ide' || config.type === 'ws-ide' ? config.ideName ?? null : null

    if (ideClient.type === 'connected') return { status: 'connected', ideName }
    if (ideClient.type === 'pending') return { status: 'pending', ideName }
    return { status: 'disconnected', ideName }
  }, [mcpClients])
}
