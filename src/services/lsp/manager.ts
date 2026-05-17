/**
 * LSP Manager singleton — direct port of CC's services/lsp/manager.ts
 *
 * Manages the global LSP server manager lifecycle:
 *   - initializeLspServerManager() called at startup
 *   - getLspServerManager() used by LspTool
 *   - shutdownLspServerManager() called at exit
 *
 * Adaptations:
 *   - logForDebugging / logError / errorMessage → inline helpers
 *   - isBareMode() → check QILING_BARE env var
 */

import { createLSPServerManager, type LSPServerManager } from './LSPServerManager'
import { registerLSPNotificationHandlers } from './passiveFeedback'

function logForDebugging(msg: string) { if (process.env.QILING_DEBUG === '1') console.error('[LSP]', msg) }
function logError(err: Error) { console.error('[LSP error]', err.message) }
function errorMessage(e: unknown): string { return e instanceof Error ? e.message : String(e) }
function isBareMode(): boolean { return process.env.QILING_BARE === '1' || process.env.QILING_NON_INTERACTIVE === '1' }

type InitializationState = 'not-started' | 'pending' | 'success' | 'failed'

let lspManagerInstance: LSPServerManager | undefined
let initializationState: InitializationState = 'not-started'
let initializationError: Error | undefined
let initializationGeneration = 0
let initializationPromise: Promise<void> | undefined

export function _resetLspManagerForTesting(): void {
  initializationState = 'not-started'
  initializationError = undefined
  initializationPromise = undefined
  initializationGeneration++
}

export function getLspServerManager(): LSPServerManager | undefined {
  if (initializationState === 'failed') return undefined
  return lspManagerInstance
}

export function getInitializationStatus():
  | { status: 'not-started' }
  | { status: 'pending' }
  | { status: 'success' }
  | { status: 'failed'; error: Error } {
  if (initializationState === 'failed') return { status: 'failed', error: initializationError ?? new Error('Initialization failed') }
  if (initializationState === 'not-started') return { status: 'not-started' }
  if (initializationState === 'pending') return { status: 'pending' }
  return { status: 'success' }
}

export function isLspConnected(): boolean {
  if (initializationState === 'failed') return false
  const manager = getLspServerManager()
  if (!manager) return false
  const servers = manager.getAllServers()
  if (servers.size === 0) return false
  for (const server of servers.values()) {
    if (server.state !== 'error') return true
  }
  return false
}

export async function waitForInitialization(): Promise<void> {
  if (initializationState === 'success' || initializationState === 'failed') return
  if (initializationState === 'pending' && initializationPromise) await initializationPromise
}

export function initializeLspServerManager(cwd?: string): void {
  if (isBareMode()) return
  logForDebugging('[LSP MANAGER] initializeLspServerManager() called')

  if (lspManagerInstance !== undefined && initializationState !== 'failed') {
    logForDebugging('[LSP MANAGER] Already initialized or initializing, skipping')
    return
  }

  if (initializationState === 'failed') {
    lspManagerInstance = undefined
    initializationError = undefined
  }

  lspManagerInstance = createLSPServerManager()
  initializationState = 'pending'

  const currentGeneration = ++initializationGeneration

  initializationPromise = lspManagerInstance
    .initialize()
    .then(() => {
      if (currentGeneration === initializationGeneration) {
        initializationState = 'success'
        logForDebugging('LSP server manager initialized successfully')
        if (lspManagerInstance) registerLSPNotificationHandlers(lspManagerInstance)
      }
    })
    .catch((error: unknown) => {
      if (currentGeneration === initializationGeneration) {
        initializationState = 'failed'
        initializationError = error as Error
        lspManagerInstance = undefined
        logError(error as Error)
        logForDebugging(`Failed to initialize LSP server manager: ${errorMessage(error)}`)
      }
    })
}

export function reinitializeLspServerManager(cwd?: string): void {
  if (initializationState === 'not-started') return
  logForDebugging('[LSP MANAGER] reinitializeLspServerManager() called')

  if (lspManagerInstance) {
    void lspManagerInstance.shutdown().catch(err => {
      logForDebugging(`[LSP MANAGER] old instance shutdown during reinit failed: ${errorMessage(err)}`)
    })
  }

  lspManagerInstance = undefined
  initializationState = 'not-started'
  initializationError = undefined

  initializeLspServerManager(cwd)
}

export async function shutdownLspServerManager(): Promise<void> {
  if (lspManagerInstance === undefined) return
  try {
    await lspManagerInstance.shutdown()
    logForDebugging('LSP server manager shut down successfully')
  } catch (error: unknown) {
    logError(error as Error)
    logForDebugging(`Failed to shutdown LSP server manager: ${errorMessage(error)}`)
  } finally {
    lspManagerInstance = undefined
    initializationState = 'not-started'
    initializationError = undefined
    initializationPromise = undefined
    initializationGeneration++
  }
}
