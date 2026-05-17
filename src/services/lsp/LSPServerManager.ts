/**
 * LSP Server Manager — direct port of CC's services/lsp/LSPServerManager.ts
 *
 * Adaptations:
 *   - getAllLspServers() from ./config (QiLing simplified version)
 *   - logForDebugging / logError / errorMessage → inline helpers
 */

import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import { getAllLspServers } from './config'
import { createLSPServerInstance, type LSPServerInstance } from './LSPServerInstance'
import type { ScopedLspServerConfig } from './types'

function logForDebugging(msg: string) { if (process.env.QILING_DEBUG === '1') console.error('[LSP]', msg) }
function logError(err: Error) { console.error('[LSP error]', err.message) }
function errorMessage(e: unknown): string { return e instanceof Error ? e.message : String(e) }

export type LSPServerManager = {
  initialize(): Promise<void>
  shutdown(): Promise<void>
  getServerForFile(filePath: string): LSPServerInstance | undefined
  ensureServerStarted(filePath: string): Promise<LSPServerInstance | undefined>
  sendRequest<T>(filePath: string, method: string, params: unknown): Promise<T | undefined>
  getAllServers(): Map<string, LSPServerInstance>
  openFile(filePath: string, content: string): Promise<void>
  changeFile(filePath: string, content: string): Promise<void>
  saveFile(filePath: string): Promise<void>
  closeFile(filePath: string): Promise<void>
  isFileOpen(filePath: string): boolean
}

export function createLSPServerManager(): LSPServerManager {
  const servers: Map<string, LSPServerInstance> = new Map()
  const extensionMap: Map<string, string[]> = new Map()
  const openedFiles: Map<string, string> = new Map()  // URI → server name

  async function initialize(): Promise<void> {
    let serverConfigs: Record<string, ScopedLspServerConfig>
    try {
      const result = await getAllLspServers()
      serverConfigs = result.servers
      logForDebugging(`[LSP SERVER MANAGER] getAllLspServers returned ${Object.keys(serverConfigs).length} server(s)`)
    } catch (error) {
      const err = error as Error
      logError(new Error(`Failed to load LSP server configuration: ${err.message}`))
      throw error
    }

    for (const [serverName, config] of Object.entries(serverConfigs)) {
      try {
        if (!config.command) throw new Error(`Server ${serverName} missing required 'command' field`)
        if (!config.extensionToLanguage || Object.keys(config.extensionToLanguage).length === 0) {
          throw new Error(`Server ${serverName} missing required 'extensionToLanguage' field`)
        }

        const fileExtensions = Object.keys(config.extensionToLanguage)
        for (const ext of fileExtensions) {
          const normalized = ext.toLowerCase()
          if (!extensionMap.has(normalized)) extensionMap.set(normalized, [])
          extensionMap.get(normalized)!.push(serverName)
        }

        const instance = createLSPServerInstance(serverName, config)
        servers.set(serverName, instance)
        logForDebugging(`Registered LSP server '${serverName}' for extensions: ${fileExtensions.join(', ')}`)
      } catch (error) {
        logError(new Error(`Failed to register LSP server '${serverName}': ${errorMessage(error)}`))
        // Continue with other servers
      }
    }

    logForDebugging(`LSP manager initialized with ${servers.size} servers`)
  }

  async function shutdown(): Promise<void> {
    const toStop = Array.from(servers.entries()).filter(([, s]) => s.state === 'running' || s.state === 'error')
    const results = await Promise.allSettled(toStop.map(([, server]) => server.stop()))
    servers.clear(); extensionMap.clear(); openedFiles.clear()

    const errors = results
      .map((r, i) => r.status === 'rejected' ? `${toStop[i]![0]}: ${errorMessage(r.reason)}` : null)
      .filter((e): e is string => e !== null)

    if (errors.length > 0) {
      const err = new Error(`Failed to stop ${errors.length} LSP server(s): ${errors.join('; ')}`)
      logError(err); throw err
    }
  }

  function getServerForFile(filePath: string): LSPServerInstance | undefined {
    const ext = path.extname(filePath).toLowerCase()
    const serverNames = extensionMap.get(ext)
    if (!serverNames || serverNames.length === 0) return undefined
    const serverName = serverNames[0]
    if (!serverName) return undefined
    return servers.get(serverName)
  }

  async function ensureServerStarted(filePath: string): Promise<LSPServerInstance | undefined> {
    const server = getServerForFile(filePath)
    if (!server) return undefined
    if (server.state === 'stopped' || server.state === 'error') {
      try { await server.start() } catch (error) {
        const err = error as Error
        logError(new Error(`Failed to start LSP server for file ${filePath}: ${err.message}`))
        throw error
      }
    }
    return server
  }

  async function sendRequest<T>(filePath: string, method: string, params: unknown): Promise<T | undefined> {
    const server = await ensureServerStarted(filePath)
    if (!server) return undefined
    try { return await server.sendRequest<T>(method, params) } catch (error) {
      const err = error as Error
      logError(new Error(`LSP request failed for file ${filePath}, method '${method}': ${err.message}`))
      throw error
    }
  }

  function getAllServers(): Map<string, LSPServerInstance> { return servers }

  async function openFile(filePath: string, content: string): Promise<void> {
    const server = await ensureServerStarted(filePath)
    if (!server) return

    const fileUri = pathToFileURL(path.resolve(filePath)).href
    if (openedFiles.get(fileUri) === server.name) {
      logForDebugging(`LSP: File already open, skipping didOpen for ${filePath}`)
      return
    }

    const ext = path.extname(filePath).toLowerCase()
    const languageId = server.config.extensionToLanguage[ext] ?? 'plaintext'

    try {
      await server.sendNotification('textDocument/didOpen', {
        textDocument: { uri: fileUri, languageId, version: 1, text: content },
      })
      openedFiles.set(fileUri, server.name)
      logForDebugging(`LSP: Sent didOpen for ${filePath} (languageId: ${languageId})`)
    } catch (error) {
      const err = new Error(`Failed to sync file open ${filePath}: ${errorMessage(error)}`)
      logError(err); throw err
    }
  }

  async function changeFile(filePath: string, content: string): Promise<void> {
    const server = getServerForFile(filePath)
    if (!server || server.state !== 'running') return openFile(filePath, content)

    const fileUri = pathToFileURL(path.resolve(filePath)).href
    if (openedFiles.get(fileUri) !== server.name) return openFile(filePath, content)

    try {
      await server.sendNotification('textDocument/didChange', {
        textDocument: { uri: fileUri, version: 1 },
        contentChanges: [{ text: content }],
      })
      logForDebugging(`LSP: Sent didChange for ${filePath}`)
    } catch (error) {
      const err = new Error(`Failed to sync file change ${filePath}: ${errorMessage(error)}`)
      logError(err); throw err
    }
  }

  async function saveFile(filePath: string): Promise<void> {
    const server = getServerForFile(filePath)
    if (!server || server.state !== 'running') return
    try {
      await server.sendNotification('textDocument/didSave', {
        textDocument: { uri: pathToFileURL(path.resolve(filePath)).href },
      })
      logForDebugging(`LSP: Sent didSave for ${filePath}`)
    } catch (error) {
      const err = new Error(`Failed to sync file save ${filePath}: ${errorMessage(error)}`)
      logError(err); throw err
    }
  }

  async function closeFile(filePath: string): Promise<void> {
    const server = getServerForFile(filePath)
    if (!server || server.state !== 'running') return
    const fileUri = pathToFileURL(path.resolve(filePath)).href
    try {
      await server.sendNotification('textDocument/didClose', {
        textDocument: { uri: fileUri },
      })
      openedFiles.delete(fileUri)
      logForDebugging(`LSP: Sent didClose for ${filePath}`)
    } catch (error) {
      const err = new Error(`Failed to sync file close ${filePath}: ${errorMessage(error)}`)
      logError(err); throw err
    }
  }

  function isFileOpen(filePath: string): boolean {
    return openedFiles.has(pathToFileURL(path.resolve(filePath)).href)
  }

  return { initialize, shutdown, getServerForFile, ensureServerStarted, sendRequest, getAllServers, openFile, changeFile, saveFile, closeFile, isFileOpen }
}
