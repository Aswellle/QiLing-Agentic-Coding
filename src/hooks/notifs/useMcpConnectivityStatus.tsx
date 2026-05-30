import * as React from 'react'
import { useEffect } from 'react'
import { useNotifications } from '../../context/notifications.js'
import { getIsRemoteMode } from '../../bootstrap/state.js'
import { Text } from 'ink'
import type { MCPServerConnection } from '../../services/mcp/types.js'

type Props = {
  mcpClients?: MCPServerConnection[]
}

const EMPTY_MCP_CLIENTS: MCPServerConnection[] = []

export function useMcpConnectivityStatus({
  mcpClients = EMPTY_MCP_CLIENTS,
}: Props): void {
  const { addNotification } = useNotifications()

  useEffect(() => {
    if (getIsRemoteMode()) return

    // QiLing MCPServerConnection has type: 'pending' | 'connected' | 'failed' | 'disabled'
    // CC also has 'needs-auth' and claudeai-proxy — not ported yet
    const failedClients = mcpClients.filter(client => client.type === 'failed')

    if (failedClients.length === 0) return

    addNotification({
      key: 'mcp-failed',
      jsx: (
        <>
          <Text color="error">
            {failedClients.length} MCP{' '}
            {failedClients.length === 1 ? 'server' : 'servers'} failed
          </Text>
          <Text dimColor> · /mcp</Text>
        </>
      ),
      priority: 'medium',
    })
  }, [addNotification, mcpClients])
}
