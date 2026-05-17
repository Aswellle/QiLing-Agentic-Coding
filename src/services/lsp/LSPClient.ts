/**
 * LSP Client — direct port of CC's services/lsp/LSPClient.ts
 *
 * Adaptations from CC:
 *   - logForDebugging → inline QILING_DEBUG check
 *   - logError → console.error
 *   - errorMessage → inline
 *   - subprocessEnv → ../../utils/subprocessEnv
 *   - vscode-jsonrpc/node.js → vscode-jsonrpc/node
 */

import { type ChildProcess, spawn } from 'node:child_process'
import {
  createMessageConnection,
  type MessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
  Trace,
} from 'vscode-jsonrpc/node'
import type {
  InitializeParams,
  InitializeResult,
  ServerCapabilities,
} from 'vscode-languageserver-protocol'
import { subprocessEnv } from '../../utils/subprocessEnv'

function logForDebugging(msg: string): void {
  if (process.env.QILING_DEBUG === '1') console.error('[LSP]', msg)
}
function logError(err: Error): void { console.error('[LSP error]', err.message) }
function errorMessage(e: unknown): string { return e instanceof Error ? e.message : String(e) }

/**
 * LSP client interface.
 */
export type LSPClient = {
  readonly capabilities: ServerCapabilities | undefined
  readonly isInitialized: boolean
  start: (
    command: string,
    args: string[],
    options?: { env?: Record<string, string>; cwd?: string },
  ) => Promise<void>
  initialize: (params: InitializeParams) => Promise<InitializeResult>
  sendRequest: <TResult>(method: string, params: unknown) => Promise<TResult>
  sendNotification: (method: string, params: unknown) => Promise<void>
  onNotification: (method: string, handler: (params: unknown) => void) => void
  onRequest: <TParams, TResult>(
    method: string,
    handler: (params: TParams) => TResult | Promise<TResult>,
  ) => void
  stop: () => Promise<void>
}

export function createLSPClient(
  serverName: string,
  onCrash?: (error: Error) => void,
): LSPClient {
  let proc: ChildProcess | undefined
  let connection: MessageConnection | undefined
  let capabilities: ServerCapabilities | undefined
  let isInitialized = false
  let startFailed = false
  let startError: Error | undefined
  let isStopping = false
  const pendingHandlers: Array<{ method: string; handler: (params: unknown) => void }> = []
  const pendingRequestHandlers: Array<{ method: string; handler: (params: unknown) => unknown | Promise<unknown> }> = []

  function checkStartFailed(): void {
    if (startFailed) throw startError || new Error(`LSP server ${serverName} failed to start`)
  }

  return {
    get capabilities() { return capabilities },
    get isInitialized() { return isInitialized },

    async start(command, args, options) {
      try {
        proc = spawn(command, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...subprocessEnv(), ...options?.env },
          cwd: options?.cwd,
          windowsHide: true,
        })

        if (!proc.stdout || !proc.stdin) throw new Error('LSP server process stdio not available')

        const spawnedProcess = proc
        await new Promise<void>((resolve, reject) => {
          const onSpawn = () => { cleanup(); resolve() }
          const onError = (error: Error) => { cleanup(); reject(error) }
          const cleanup = () => {
            spawnedProcess.removeListener('spawn', onSpawn)
            spawnedProcess.removeListener('error', onError)
          }
          spawnedProcess.once('spawn', onSpawn)
          spawnedProcess.once('error', onError)
        })

        if (proc.stderr) {
          proc.stderr.on('data', (data: Buffer) => {
            const output = data.toString().trim()
            if (output) logForDebugging(`[${serverName}] ${output}`)
          })
        }

        proc.on('error', error => {
          if (!isStopping) {
            startFailed = true; startError = error
            logError(new Error(`LSP server ${serverName} failed: ${error.message}`))
          }
        })

        proc.on('exit', (code) => {
          if (code !== 0 && code !== null && !isStopping) {
            isInitialized = false; startFailed = false; startError = undefined
            const crashError = new Error(`LSP server ${serverName} crashed with exit code ${code}`)
            logError(crashError)
            onCrash?.(crashError)
          }
        })

        proc.stdin.on('error', (error: Error) => {
          if (!isStopping) logForDebugging(`stdin error for ${serverName}: ${error.message}`)
        })

        const reader = new StreamMessageReader(proc.stdout)
        const writer = new StreamMessageWriter(proc.stdin)
        connection = createMessageConnection(reader, writer)

        connection.onError(([error]) => {
          if (!isStopping) {
            startFailed = true; startError = error
            logError(new Error(`LSP ${serverName} connection error: ${error.message}`))
          }
        })

        connection.onClose(() => {
          if (!isStopping) { isInitialized = false; logForDebugging(`${serverName} connection closed`) }
        })

        connection.listen()

        connection.trace(Trace.Verbose, {
          log: (message: string) => logForDebugging(`[PROTOCOL ${serverName}] ${message}`),
        }).catch((error: Error) => logForDebugging(`Failed to enable tracing for ${serverName}: ${error.message}`))

        for (const { method, handler } of pendingHandlers) {
          connection.onNotification(method, handler)
        }
        pendingHandlers.length = 0

        for (const { method, handler } of pendingRequestHandlers) {
          connection.onRequest(method, handler)
        }
        pendingRequestHandlers.length = 0

        logForDebugging(`LSP client started for ${serverName}`)
      } catch (error) {
        const err = error as Error
        logError(new Error(`LSP server ${serverName} failed to start: ${err.message}`))
        throw error
      }
    },

    async initialize(params) {
      if (!connection) throw new Error('LSP client not started')
      checkStartFailed()
      try {
        const result: InitializeResult = await connection.sendRequest('initialize', params)
        capabilities = result.capabilities
        await connection.sendNotification('initialized', {})
        isInitialized = true
        logForDebugging(`LSP server ${serverName} initialized`)
        return result
      } catch (error) {
        const err = error as Error
        logError(new Error(`LSP ${serverName} initialize failed: ${err.message}`))
        throw error
      }
    },

    async sendRequest<TResult>(method: string, params: unknown): Promise<TResult> {
      if (!connection) throw new Error('LSP client not started')
      checkStartFailed()
      if (!isInitialized) throw new Error('LSP server not initialized')
      try {
        return await connection.sendRequest(method, params)
      } catch (error) {
        const err = error as Error
        logError(new Error(`LSP ${serverName} request ${method} failed: ${err.message}`))
        throw error
      }
    },

    async sendNotification(method, params) {
      if (!connection) throw new Error('LSP client not started')
      checkStartFailed()
      try {
        await connection.sendNotification(method, params)
      } catch (error) {
        const err = error as Error
        logError(new Error(`LSP ${serverName} notification ${method} failed: ${err.message}`))
        logForDebugging(`Notification ${method} failed but continuing`)
      }
    },

    onNotification(method, handler) {
      if (!connection) { pendingHandlers.push({ method, handler }); return }
      checkStartFailed()
      connection.onNotification(method, handler)
    },

    onRequest<TParams, TResult>(method: string, handler: (params: TParams) => TResult | Promise<TResult>) {
      if (!connection) {
        pendingRequestHandlers.push({ method, handler: handler as (params: unknown) => unknown | Promise<unknown> })
        return
      }
      checkStartFailed()
      connection.onRequest(method, handler)
    },

    async stop() {
      let shutdownError: Error | undefined
      isStopping = true
      try {
        if (connection) {
          await connection.sendRequest('shutdown', {})
          await connection.sendNotification('exit', {})
        }
      } catch (error) {
        const err = error as Error
        logError(new Error(`LSP ${serverName} stop failed: ${err.message}`))
        shutdownError = err
      } finally {
        if (connection) {
          try { connection.dispose() } catch (e) { logForDebugging(`Connection disposal failed: ${errorMessage(e)}`) }
          connection = undefined
        }
        if (proc) {
          proc.removeAllListeners('error')
          proc.removeAllListeners('exit')
          if (proc.stdin) proc.stdin.removeAllListeners('error')
          if (proc.stderr) proc.stderr.removeAllListeners('data')
          try { proc.kill() } catch { /* already dead */ }
          proc = undefined
        }
        isInitialized = false; capabilities = undefined; isStopping = false
        if (shutdownError) { startFailed = true; startError = shutdownError }
        logForDebugging(`LSP client stopped for ${serverName}`)
      }
      if (shutdownError) throw shutdownError
    },
  }
}
