/**
 * MCP WebSocket transport — adapted from CC's utils/mcpWebSocketTransport.ts
 *
 * Implements the MCP Transport interface over a WebSocket connection.
 * Supports both Bun's native WebSocket (globalThis.WebSocket) and the
 * Node.js `ws` package. Bun detection uses `typeof Bun !== 'undefined'`.
 *
 * Usage:
 *   const ws = new WebSocket('ws://localhost:3000/mcp')
 *   const transport = new WebSocketTransport(ws)
 *   const client = new Client({ name: 'qiling', version: '1.0.0' }, {})
 *   await client.connect(transport)
 */

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import {
  type JSONRPCMessage,
  JSONRPCMessageSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { toError } from './errors.js'
import { jsonParse, jsonStringify } from './slowOperations.js'

// WebSocket readyState constants (same for both native and ws package)
const WS_CONNECTING = 0
const WS_OPEN = 1

type WebSocketLike = {
  readonly readyState: number
  close(): void
  send(data: string): void
}

export class WebSocketTransport implements Transport {
  private started = false
  private opened: Promise<void>
  private isBun = typeof Bun !== 'undefined'

  constructor(private ws: WebSocketLike) {
    this.opened = new Promise((resolve, reject) => {
      if (this.ws.readyState === WS_OPEN) {
        resolve()
      } else if (this.isBun) {
        const nws = this.ws as unknown as globalThis.WebSocket
        const onOpen = () => {
          nws.removeEventListener('open', onOpen)
          nws.removeEventListener('error', onError)
          resolve()
        }
        const onError = (event: Event) => {
          nws.removeEventListener('open', onOpen)
          nws.removeEventListener('error', onError)
          reject(event)
        }
        nws.addEventListener('open', onOpen)
        nws.addEventListener('error', onError)
      } else {
        // Node.js ws package
        type WsNode = { on(ev: string, fn: (...args: unknown[]) => void): void }
        const nws = this.ws as unknown as WsNode
        nws.on('open', () => resolve())
        nws.on('error', (error: unknown) => reject(error))
      }
    })

    // Attach persistent event handlers
    if (this.isBun) {
      const nws = this.ws as unknown as globalThis.WebSocket
      nws.addEventListener('message', this.onBunMessage)
      nws.addEventListener('error', this.onBunError)
      nws.addEventListener('close', this.onBunClose)
    } else {
      type WsNode = { on(ev: string, fn: (...args: unknown[]) => void): void }
      const nws = this.ws as unknown as WsNode
      nws.on('message', this.onNodeMessage)
      nws.on('error', this.onNodeError)
      nws.on('close', this.onNodeClose)
    }
  }

  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: JSONRPCMessage) => void

  // ─── Bun event handlers ───────────────────────────────────────────────────

  private onBunMessage = (event: MessageEvent) => {
    try {
      const data = typeof event.data === 'string' ? event.data : String(event.data)
      const message = JSONRPCMessageSchema.parse(jsonParse(data))
      this.onmessage?.(message)
    } catch (error) {
      this.handleError(error)
    }
  }

  private onBunError = () => {
    this.handleError(new Error('WebSocket error'))
  }

  private onBunClose = () => {
    this.handleCloseCleanup()
  }

  // ─── Node/ws event handlers ───────────────────────────────────────────────

  private onNodeMessage = (data: unknown) => {
    try {
      const str = Buffer.isBuffer(data)
        ? (data as Buffer).toString('utf-8')
        : String(data)
      const message = JSONRPCMessageSchema.parse(jsonParse(str))
      this.onmessage?.(message)
    } catch (error) {
      this.handleError(error)
    }
  }

  private onNodeError = (error: unknown) => {
    this.handleError(error)
  }

  private onNodeClose = () => {
    this.handleCloseCleanup()
  }

  // ─── Shared helpers ───────────────────────────────────────────────────────

  private handleError(error: unknown): void {
    this.onerror?.(toError(error))
  }

  private handleCloseCleanup(): void {
    this.onclose?.()
    if (this.isBun) {
      const nws = this.ws as unknown as globalThis.WebSocket
      nws.removeEventListener('message', this.onBunMessage)
      nws.removeEventListener('error', this.onBunError)
      nws.removeEventListener('close', this.onBunClose)
    } else {
      type WsNode = { off(ev: string, fn: (...args: unknown[]) => void): void }
      const nws = this.ws as unknown as WsNode
      nws.off('message', this.onNodeMessage)
      nws.off('error', this.onNodeError)
      nws.off('close', this.onNodeClose)
    }
  }

  // ─── Transport interface ──────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.started) {
      throw new Error('Start can only be called once per transport.')
    }
    await this.opened
    if (this.ws.readyState !== WS_OPEN) {
      throw new Error('WebSocket is not open. Cannot start transport.')
    }
    this.started = true
  }

  async close(): Promise<void> {
    if (this.ws.readyState === WS_OPEN || this.ws.readyState === WS_CONNECTING) {
      this.ws.close()
    }
    this.handleCloseCleanup()
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.ws.readyState !== WS_OPEN) {
      throw new Error('WebSocket is not open. Cannot send message.')
    }
    const json = jsonStringify(message)

    try {
      if (this.isBun) {
        // Bun's WebSocket.send() is synchronous
        this.ws.send(json)
      } else {
        await new Promise<void>((resolve, reject) => {
          type WsNode = { send(data: string, cb: (err?: Error) => void): void }
          ;(this.ws as unknown as WsNode).send(json, err => {
            if (err) reject(err)
            else resolve()
          })
        })
      }
    } catch (error) {
      this.handleError(error)
      throw error
    }
  }
}
