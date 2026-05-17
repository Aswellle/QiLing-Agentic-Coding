/**
 * LSP Server Instance — direct port of CC's services/lsp/LSPServerInstance.ts
 *
 * Adaptations:
 *   - getCwd → process.cwd()
 *   - logForDebugging / logError / errorMessage → inline helpers
 *   - sleep → ../../utils/sleep
 *   - require('./LSPClient.js') → createLSPClient imported directly
 */

import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { InitializeParams } from 'vscode-languageserver-protocol'
import { sleep } from '../../utils/sleep'
import { createLSPClient } from './LSPClient'
import type { LspServerState, ScopedLspServerConfig } from './types'

function logForDebugging(msg: string) { if (process.env.QILING_DEBUG === '1') console.error('[LSP]', msg) }
function logError(err: Error) { console.error('[LSP error]', err.message) }
function errorMessage(e: unknown): string { return e instanceof Error ? e.message : String(e) }

const LSP_ERROR_CONTENT_MODIFIED = -32801
const MAX_RETRIES_FOR_TRANSIENT_ERRORS = 3
const RETRY_BASE_DELAY_MS = 500

export type LSPServerInstance = {
  readonly name: string
  readonly config: ScopedLspServerConfig
  readonly state: LspServerState
  readonly startTime: Date | undefined
  readonly lastError: Error | undefined
  readonly restartCount: number
  start(): Promise<void>
  stop(): Promise<void>
  restart(): Promise<void>
  isHealthy(): boolean
  sendRequest<T>(method: string, params: unknown): Promise<T>
  sendNotification(method: string, params: unknown): Promise<void>
  onNotification(method: string, handler: (params: unknown) => void): void
  onRequest<TParams, TResult>(method: string, handler: (params: TParams) => TResult | Promise<TResult>): void
}

export function createLSPServerInstance(name: string, config: ScopedLspServerConfig): LSPServerInstance {
  if (config.restartOnCrash !== undefined) throw new Error(`LSP server '${name}': restartOnCrash is not yet implemented.`)
  if (config.shutdownTimeout !== undefined) throw new Error(`LSP server '${name}': shutdownTimeout is not yet implemented.`)

  let state: LspServerState = 'stopped'
  let startTime: Date | undefined
  let lastError: Error | undefined
  let restartCount = 0
  let crashRecoveryCount = 0

  const client = createLSPClient(name, error => {
    state = 'error'
    lastError = error
    crashRecoveryCount++
  })

  async function start(): Promise<void> {
    if (state === 'running' || state === 'starting') return

    const maxRestarts = config.maxRestarts ?? 3
    if (state === 'error' && crashRecoveryCount > maxRestarts) {
      const error = new Error(`LSP server '${name}' exceeded max crash recovery attempts (${maxRestarts})`)
      lastError = error; logError(error); throw error
    }

    let initPromise: Promise<unknown> | undefined
    try {
      state = 'starting'
      logForDebugging(`Starting LSP server instance: ${name}`)

      await client.start(config.command, config.args ?? [], { env: config.env, cwd: config.workspaceFolder })

      const workspaceFolder = config.workspaceFolder ?? process.cwd()
      const workspaceUri = pathToFileURL(workspaceFolder).href

      const initParams: InitializeParams = {
        processId: process.pid,
        initializationOptions: config.initializationOptions ?? {},
        workspaceFolders: [{ uri: workspaceUri, name: path.basename(workspaceFolder) }],
        rootPath: workspaceFolder,
        rootUri: workspaceUri,
        capabilities: {
          workspace: { configuration: false, workspaceFolders: false },
          textDocument: {
            synchronization: { dynamicRegistration: false, willSave: false, willSaveWaitUntil: false, didSave: true },
            publishDiagnostics: {
              relatedInformation: true,
              tagSupport: { valueSet: [1, 2] },
              versionSupport: false,
              codeDescriptionSupport: true,
              dataSupport: false,
            },
            hover: { dynamicRegistration: false, contentFormat: ['markdown', 'plaintext'] },
            definition: { dynamicRegistration: false, linkSupport: true },
            references: { dynamicRegistration: false },
            documentSymbol: { dynamicRegistration: false, hierarchicalDocumentSymbolSupport: true },
            callHierarchy: { dynamicRegistration: false },
          },
          general: { positionEncodings: ['utf-16'] },
        },
      }

      initPromise = client.initialize(initParams)
      if (config.startupTimeout !== undefined) {
        await withTimeout(initPromise, config.startupTimeout, `LSP server '${name}' timed out after ${config.startupTimeout}ms during initialization`)
      } else {
        await initPromise
      }

      state = 'running'; startTime = new Date(); crashRecoveryCount = 0
      logForDebugging(`LSP server instance started: ${name}`)
    } catch (error) {
      client.stop().catch(() => {})
      initPromise?.catch(() => {})
      state = 'error'; lastError = error as Error; logError(error as Error); throw error
    }
  }

  async function stop(): Promise<void> {
    if (state === 'stopped' || state === 'stopping') return
    try {
      state = 'stopping'
      await client.stop()
      state = 'stopped'
      logForDebugging(`LSP server instance stopped: ${name}`)
    } catch (error) {
      state = 'error'; lastError = error as Error; logError(error as Error); throw error
    }
  }

  async function restart(): Promise<void> {
    try { await stop() } catch (error) {
      const err = new Error(`Failed to stop LSP server '${name}' during restart: ${errorMessage(error)}`)
      logError(err); throw err
    }
    restartCount++
    const maxRestarts = config.maxRestarts ?? 3
    if (restartCount > maxRestarts) {
      const error = new Error(`Max restart attempts (${maxRestarts}) exceeded for server '${name}'`)
      logError(error); throw error
    }
    try { await start() } catch (error) {
      const err = new Error(`Failed to start LSP server '${name}' during restart (${restartCount}/${maxRestarts}): ${errorMessage(error)}`)
      logError(err); throw err
    }
  }

  function isHealthy(): boolean { return state === 'running' && client.isInitialized }

  async function sendRequest<T>(method: string, params: unknown): Promise<T> {
    if (!isHealthy()) {
      const error = new Error(`Cannot send request to LSP server '${name}': server is ${state}${lastError ? `, last error: ${lastError.message}` : ''}`)
      logError(error); throw error
    }
    let lastAttemptError: Error | undefined
    for (let attempt = 0; attempt <= MAX_RETRIES_FOR_TRANSIENT_ERRORS; attempt++) {
      try { return await client.sendRequest(method, params) } catch (error) {
        lastAttemptError = error as Error
        const errorCode = (error as { code?: number }).code
        const isContentModified = typeof errorCode === 'number' && errorCode === LSP_ERROR_CONTENT_MODIFIED
        if (isContentModified && attempt < MAX_RETRIES_FOR_TRANSIENT_ERRORS) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt)
          logForDebugging(`LSP request '${method}' to '${name}' got ContentModified, retrying in ${delay}ms (${attempt + 1}/${MAX_RETRIES_FOR_TRANSIENT_ERRORS})…`)
          await sleep(delay); continue
        }
        break
      }
    }
    const requestError = new Error(`LSP request '${method}' failed for server '${name}': ${lastAttemptError?.message ?? 'unknown error'}`)
    logError(requestError); throw requestError
  }

  async function sendNotification(method: string, params: unknown): Promise<void> {
    if (!isHealthy()) {
      const error = new Error(`Cannot send notification to LSP server '${name}': server is ${state}`)
      logError(error); throw error
    }
    try { await client.sendNotification(method, params) } catch (error) {
      const err = new Error(`LSP notification '${method}' failed for server '${name}': ${errorMessage(error)}`)
      logError(err); throw err
    }
  }

  function onNotification(method: string, handler: (params: unknown) => void): void { client.onNotification(method, handler) }
  function onRequest<TParams, TResult>(method: string, handler: (params: TParams) => TResult | Promise<TResult>): void { client.onRequest(method, handler) }

  return {
    name, config,
    get state() { return state },
    get startTime() { return startTime },
    get lastError() { return lastError },
    get restartCount() { return restartCount },
    start, stop, restart, isHealthy, sendRequest, sendNotification, onNotification, onRequest,
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout((rej, msg) => rej(new Error(msg)), ms, reject, message)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer!))
}
