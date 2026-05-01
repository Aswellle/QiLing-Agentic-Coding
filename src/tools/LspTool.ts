/**
 * LSP Tool — Language Server Protocol diagnostics
 *
 * Connects to language servers via stdio and retrieves diagnostics
 * (errors, warnings, hints) for source files.
 *
 * Supported language servers (auto-detected from PATH):
 *   TypeScript/JavaScript → typescript-language-server --stdio
 *   Python                → pylsp  OR  pyright-langserver --stdio
 *   Go                    → gopls
 *   Rust                  → rust-analyzer
 *
 * Usage:
 *   After editing a file, call LspDiagnostics to check for errors immediately.
 *   The AI can use this to verify its changes are syntactically correct.
 */
import { z } from 'zod'
import { existsSync } from 'fs'
import { resolve, extname } from 'path'
import type { Tool, ToolResult, ToolContext, ToolDefinition } from '../types/tool'

const inputSchema = z.object({
  file_path: z.string().describe('Path to the file to check for diagnostics'),
  timeout: z.number().int().default(15000).describe('Timeout in ms (default 15s)'),
})

type Input = z.infer<typeof inputSchema>

// ── Language server detection ────────────────────────────────────────────────

interface LsConfig {
  command: string
  args: string[]
  languageId: string
}

const EXT_TO_LS: Record<string, LsConfig[]> = {
  '.ts':   [
    { command: 'typescript-language-server', args: ['--stdio'], languageId: 'typescript' },
    { command: 'tsserver', args: [], languageId: 'typescript' },
  ],
  '.tsx':  [{ command: 'typescript-language-server', args: ['--stdio'], languageId: 'typescriptreact' }],
  '.js':   [{ command: 'typescript-language-server', args: ['--stdio'], languageId: 'javascript' }],
  '.jsx':  [{ command: 'typescript-language-server', args: ['--stdio'], languageId: 'javascriptreact' }],
  '.py':   [
    { command: 'pylsp', args: [], languageId: 'python' },
    { command: 'pyright-langserver', args: ['--stdio'], languageId: 'python' },
  ],
  '.go':   [{ command: 'gopls', args: [], languageId: 'go' }],
  '.rs':   [{ command: 'rust-analyzer', args: [], languageId: 'rust' }],
  '.rb':   [{ command: 'solargraph', args: ['stdio'], languageId: 'ruby' }],
}

async function findLanguageServer(ext: string): Promise<LsConfig | null> {
  const candidates = EXT_TO_LS[ext]
  if (!candidates) return null

  for (const candidate of candidates) {
    const found = await commandExists(candidate.command)
    if (found) return candidate
  }
  return null
}

async function commandExists(cmd: string): Promise<boolean> {
  try {
    const which = process.platform === 'win32' ? 'where' : 'which'
    const proc = Bun.spawn([which, cmd], { stdout: 'pipe', stderr: 'pipe' })
    await proc.exited
    return proc.exitCode === 0
  } catch {
    return false
  }
}

// ── Simplified LSP client (diagnostics only) ─────────────────────────────────

interface LspDiagnostic {
  line: number          // 1-indexed
  character: number     // 1-indexed
  severity: 'error' | 'warning' | 'info' | 'hint'
  message: string
  source?: string
  code?: string | number
}

interface LspMessage {
  method?: string
  params?: {
    uri?: string
    diagnostics?: Array<{
      range: { start: { line: number; character: number } }
      severity?: number
      message: string
      source?: string
      code?: string | number
    }>
  }
  [key: string]: unknown
}

async function getDiagnosticsViaCli(
  filePath: string,
  workingDir: string,
  lsConfig: LsConfig,
  timeout: number
): Promise<LspDiagnostic[]> {
  const absPath = resolve(workingDir, filePath)
  const fileUri = `file:///${absPath.replace(/\\/g, '/').replace(/^\//, '')}`
  const fileContent = Bun.file(absPath).text()

  const proc = Bun.spawn([lsConfig.command, ...lsConfig.args], {
    cwd: workingDir,
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const stdin = proc.stdin as import('bun').FileSink

  let nextId = 1
  const send = (obj: unknown) => {
    const msg = JSON.stringify(obj)
    stdin.write(`Content-Length: ${Buffer.byteLength(msg)}\r\n\r\n${msg}`)
  }

  // Initialize
  send({
    jsonrpc: '2.0', id: nextId++, method: 'initialize',
    params: {
      processId: process.pid,
      rootUri: `file:///${workingDir.replace(/\\/g, '/').replace(/^\//, '')}`,
      capabilities: {
        textDocument: { publishDiagnostics: { relatedInformation: false } },
      },
      initializationOptions: {},
    },
  })

  const diagnostics: LspDiagnostic[] = []
  let initialized = false
  let gotDiagnostics = false
  let buffer = ''

  const reader = (proc.stdout as ReadableStream<Uint8Array>).getReader()
  const decoder = new TextDecoder()

  const readTimeout = setTimeout(() => proc.kill(), timeout)

  try {
    // Open the document after initialization
    const content = await fileContent

    while (!gotDiagnostics) {
      const { done, value } = await Promise.race([
        reader.read(),
        new Promise<{ done: true; value: undefined }>(resolve =>
          setTimeout(() => resolve({ done: true, value: undefined }), timeout)
        ),
      ])

      if (done) break
      buffer += decoder.decode(value)

      // Parse LSP header-delimited messages
      while (true) {
        const headerEnd = buffer.indexOf('\r\n\r\n')
        if (headerEnd === -1) break

        const header = buffer.slice(0, headerEnd)
        const lengthMatch = header.match(/Content-Length: (\d+)/i)
        if (!lengthMatch) { buffer = buffer.slice(headerEnd + 4); continue }

        const length = parseInt(lengthMatch[1], 10)
        const msgStart = headerEnd + 4
        if (buffer.length < msgStart + length) break

        const rawMsg = buffer.slice(msgStart, msgStart + length)
        buffer = buffer.slice(msgStart + length)

        try {
          const msg = JSON.parse(rawMsg) as LspMessage

          // Initialize response → send initialized + open file
          if (msg.id === 1 && !initialized) {
            initialized = true
            send({ jsonrpc: '2.0', method: 'initialized', params: {} })
            send({
              jsonrpc: '2.0', method: 'textDocument/didOpen',
              params: {
                textDocument: { uri: fileUri, languageId: lsConfig.languageId, version: 1, text: content },
              },
            })
          }

          // Diagnostics notification
          if (msg.method === 'textDocument/publishDiagnostics' &&
              msg.params?.uri === fileUri &&
              msg.params?.diagnostics) {
            for (const d of msg.params.diagnostics) {
              diagnostics.push({
                line: d.range.start.line + 1,
                character: d.range.start.character + 1,
                severity: severityToString(d.severity),
                message: d.message,
                source: d.source,
                code: d.code,
              })
            }
            gotDiagnostics = true
          }
        } catch { /* skip malformed */ }
      }
    }
  } finally {
    clearTimeout(readTimeout)
    reader.cancel().catch(() => {})
    proc.kill()
  }

  return diagnostics
}

function severityToString(n?: number): LspDiagnostic['severity'] {
  switch (n) {
    case 1: return 'error'
    case 2: return 'warning'
    case 3: return 'info'
    case 4: return 'hint'
    default: return 'error'
  }
}

function formatDiagnostics(diagnostics: LspDiagnostic[], filePath: string): string {
  if (diagnostics.length === 0) return `✓ No issues found in ${filePath}`

  const errors   = diagnostics.filter(d => d.severity === 'error')
  const warnings = diagnostics.filter(d => d.severity === 'warning')
  const others   = diagnostics.filter(d => d.severity !== 'error' && d.severity !== 'warning')

  const lines: string[] = [
    `Diagnostics for ${filePath}: ${errors.length} errors, ${warnings.length} warnings`,
    '',
  ]

  for (const d of [...errors, ...warnings, ...others].slice(0, 50)) {
    const icon = d.severity === 'error' ? '✗' : d.severity === 'warning' ? '⚠' : 'ℹ'
    const src = d.source ? `[${d.source}] ` : ''
    lines.push(`${icon} ${d.line}:${d.character}  ${src}${d.message}`)
  }

  if (diagnostics.length > 50) {
    lines.push(`... and ${diagnostics.length - 50} more`)
  }

  return lines.join('\n')
}

// ── Tool export ───────────────────────────────────────────────────────────────

export const LspTool: Tool<Input> = {
  name: 'LspDiagnostics',
  description:
    'Get language server diagnostics (errors, warnings) for a source file. ' +
    'Uses the language server for the file\'s language if available: ' +
    'TypeScript/JS (typescript-language-server), Python (pylsp/pyright), Go (gopls), Rust (rust-analyzer). ' +
    'Use after FileEdit to verify the change has no type errors.',
  inputSchema,

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    const absPath = resolve(context.workingDir, input.file_path)

    if (!existsSync(absPath)) {
      return { content: [{ type: 'text', text: `File not found: ${input.file_path}` }], isError: true }
    }

    const ext = extname(absPath).toLowerCase()
    const lsConfig = await findLanguageServer(ext)

    if (!lsConfig) {
      const supported = Object.keys(EXT_TO_LS).join(', ')
      return {
        content: [{
          type: 'text',
          text: `No language server found for ${ext} files.\nSupported extensions: ${supported}\nInstall the appropriate language server and try again.`,
        }],
      }
    }

    try {
      const diagnostics = await getDiagnosticsViaCli(
        input.file_path,
        context.workingDir,
        lsConfig,
        input.timeout
      )
      return { content: [{ type: 'text', text: formatDiagnostics(diagnostics, input.file_path) }] }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `LSP error: ${error instanceof Error ? error.message : String(error)}\nLanguage server: ${lsConfig.command}`,
        }],
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
          file_path: { type: 'string', description: 'File to check' },
          timeout: { type: 'integer', description: 'Timeout ms', default: 15000 },
        },
        required: ['file_path'],
      },
    }
  },
}
