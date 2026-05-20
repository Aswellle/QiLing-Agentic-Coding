/**
 * SDK MCP Transport Bridge — adapted from CC's services/mcp/SdkControlTransport.ts
 *
 * Bridges MCP communication between CLI process (MCP client) and SDK process (MCP server).
 * SdkControlClientTransport: CLI side — wraps MCP messages into control requests.
 * SdkControlServerTransport: SDK side — forwards control request messages to MCP server.
 */

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js'

export type SendMcpMessageCallback = (serverName: string, message: JSONRPCMessage) => Promise<JSONRPCMessage>

export class SdkControlClientTransport implements Transport {
  private isClosed = false
  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: JSONRPCMessage) => void

  constructor(private serverName: string, private sendMcpMessage: SendMcpMessageCallback) {}

  async start(): Promise<void> {}

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.isClosed) throw new Error('Transport is closed')
    const response = await this.sendMcpMessage(this.serverName, message)
    this.onmessage?.(response)
  }

  async close(): Promise<void> {
    if (this.isClosed) return
    this.isClosed = true
    this.onclose?.()
  }
}

export class SdkControlServerTransport implements Transport {
  private isClosed = false
  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: JSONRPCMessage) => void

  constructor(private sendMcpMessage: (message: JSONRPCMessage) => void) {}

  async start(): Promise<void> {}

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.isClosed) throw new Error('Transport is closed')
    this.sendMcpMessage(message)
  }

  async close(): Promise<void> {
    if (this.isClosed) return
    this.isClosed = true
    this.onclose?.()
  }
}
