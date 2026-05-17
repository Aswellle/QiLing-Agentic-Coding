/**
 * LSP Tool — Language Server Protocol diagnostics via persistent connection manager
 *
 * Phase 4 upgrade: replaces per-call server spawning with the persistent
 * LSPServerManager (port of CC's services/lsp/) that keeps servers alive
 * across calls, tracks file sync state, and delivers diagnostics passively.
 *
 * Supported language servers (auto-detected from PATH):
 *   TypeScript/JavaScript → typescript-language-server --stdio
 *   Python                → pylsp OR pyright-langserver --stdio
 *   Go                    → gopls
 *   Rust                  → rust-analyzer
 *   Ruby                  → solargraph stdio
 *
 * Additional servers can be configured in settings.json → lspServers section.
 */

import { z } from 'zod'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, extname } from 'node:path'
import type { Tool, ToolResult, ToolContext, ToolDefinition } from '../types/tool'
import {
  getLspServerManager,
  initializeLspServerManager,
  isLspConnected,
  waitForInitialization,
} from '../services/lsp/manager'

const inputSchema = z.object({
  file_path: z.string().describe('Path to the file to check for diagnostics'),
  timeout: z.number().int().default(15000).describe('Timeout in ms (default 15s)'),
})

type Input = z.infer<typeof inputSchema>

// ─── Tool ─────────────────────────────────────────────────────────────────────

export const LspTool: Tool<Input> = {
  name: 'LspDiagnostics',
  description: `Get Language Server Protocol (LSP) diagnostics for a source file.

Returns errors, warnings, and hints from the language server for the specified file.
Use after editing files to verify correctness before proceeding.

Supported languages (auto-detected):
  TypeScript/JavaScript  → typescript-language-server
  Python                 → pylsp or pyright-langserver
  Go                     → gopls
  Rust                   → rust-analyzer
  Ruby                   → solargraph

Configure additional servers in .qiling/settings.json under "lspServers".

Returns "No LSP server available" if no server is installed for the file type.`,

  inputSchema,

  isConcurrencySafe(_input: Input): boolean { return true },

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    const filePath = resolve(context.workingDir, input.file_path)
    const timeout = Math.min(Math.max(input.timeout, 1000), 60_000)

    if (!existsSync(filePath)) {
      return { content: [{ type: 'text', text: `File not found: ${input.file_path}` }], isError: true }
    }

    const ext = extname(filePath).toLowerCase()

    // Initialize the manager if not yet started
    if (!isLspConnected()) {
      initializeLspServerManager(context.workingDir)
      // Wait up to 10s for init (servers may be slow to start on first call)
      const initTimeout = Math.min(timeout, 10_000)
      await Promise.race([
        waitForInitialization(),
        new Promise(r => setTimeout(r, initTimeout)),
      ])
    }

    const manager = getLspServerManager()
    if (!manager) {
      return {
        content: [{ type: 'text', text: `No LSP server available for ${ext} files. Install a language server (e.g., typescript-language-server) to enable diagnostics.` }],
      }
    }

    try {
      // Ensure server is started for this file type
      const server = await Promise.race([
        manager.ensureServerStarted(filePath),
        new Promise<undefined>((_, reject) =>
          setTimeout(() => reject(new Error(`LSP server start timed out after ${timeout}ms`)), timeout)
        ),
      ])

      if (!server) {
        return {
          content: [{ type: 'text', text: `No LSP server configured for ${ext} files. Supported: .ts .tsx .js .jsx .py .go .rs .rb` }],
        }
      }

      // Sync file to LSP server
      const content = readFileSync(filePath, 'utf-8')
      await manager.openFile(filePath, content)

      // Request diagnostics via textDocument/diagnostic (LSP 3.17+)
      // Fall back to waiting for publishDiagnostics notification
      let diagnosticText: string

      try {
        type DiagnosticResponse = {
          kind: string
          items: Array<{
            message: string
            severity?: number
            range: { start: { line: number; character: number }; end: { line: number; character: number } }
            source?: string
            code?: string | number
          }>
        }

        const result = await Promise.race([
          manager.sendRequest<DiagnosticResponse>(filePath, 'textDocument/diagnostic', {
            textDocument: { uri: `file://${filePath.replace(/\\/g, '/')}` },
          }),
          new Promise<undefined>((_, reject) =>
            setTimeout(() => reject(new Error('Diagnostic request timed out')), Math.min(timeout, 8_000))
          ),
        ])

        if (result && result.items && result.items.length > 0) {
          const lines = result.items.map(d => {
            const sev = d.severity === 1 ? 'ERROR' : d.severity === 2 ? 'WARN' : d.severity === 3 ? 'INFO' : 'HINT'
            return `  [${sev}] Line ${d.range.start.line + 1}:${d.range.start.character + 1} — ${d.message}${d.source ? ` (${d.source})` : ''}`
          })
          diagnosticText = `${result.items.length} diagnostic(s) in ${input.file_path}:\n${lines.join('\n')}`
        } else {
          diagnosticText = `✓ No diagnostics in ${input.file_path}`
        }
      } catch {
        // textDocument/diagnostic not supported — wait for publishDiagnostics notification
        // Give the server 3s to push diagnostics after the file sync
        await new Promise(r => setTimeout(r, 3000))

        const { getLSPDiagnosticsText } = await import('../services/lsp/LSPDiagnosticRegistry')
        const notifText = getLSPDiagnosticsText()
        diagnosticText = notifText ?? `✓ No diagnostics in ${input.file_path}`
      }

      return { content: [{ type: 'text', text: diagnosticText }] }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return {
        content: [{ type: 'text', text: `LSP error for ${input.file_path}: ${msg}` }],
        isError: true,
      }
    }
  },

  toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Path to the file to check' },
          timeout: { type: 'integer', description: 'Timeout in ms (default 15000)', default: 15000 },
        },
        required: ['file_path'],
      },
    }
  },
}
