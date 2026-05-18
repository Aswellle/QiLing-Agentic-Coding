/**
 * In-process MCP transport pair — direct port of CC's services/mcp/InProcessTransport.ts
 *
 * Implements the MCP Transport interface for same-process communication —
 * no subprocess spawning required. Used for:
 * - Testing MCP servers without network/stdio
 * - Embedding MCP servers directly in the agent process
 * - Teammate in-process communication
 *
 * Usage:
 *   const [clientTransport, serverTransport] = createLinkedTransportPair()
 *   await mcpClient.connect(clientTransport)
 *   await myMcpServer.connect(serverTransport)
 */

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js'

class InProcessTransport implements Transport {
  private peer: InProcessTransport | undefined
  private closed = false

  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: JSONRPCMessage) => void

  /** @internal */
  _setPeer(peer: InProcessTransport): void {
    this.peer = peer
  }

  async start(): Promise<void> {}

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.closed) throw new Error('Transport is closed')
    // Asynchronous delivery avoids stack depth issues in request/response cycles
    queueMicrotask(() => {
      this.peer?.onmessage?.(message)
    })
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    this.onclose?.()
    if (this.peer && !this.peer.closed) {
      this.peer.closed = true
      this.peer.onclose?.()
    }
  }
}

/**
 * Create a pair of linked transports for in-process MCP communication.
 * Messages sent on one transport are delivered to the other's onmessage.
 *
 * @returns [clientTransport, serverTransport]
 */
export function createLinkedTransportPair(): [Transport, Transport] {
  const a = new InProcessTransport()
  const b = new InProcessTransport()
  a._setPeer(b)
  b._setPeer(a)
  return [a, b]
}
