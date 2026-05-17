/**
 * LSP server configuration loader — QiLing simplified version.
 *
 * CC loads LSP configs only from plugins. QiLing also supports:
 *   1. settings.json lspServers section (explicit configuration)
 *   2. Auto-detection of common language servers from PATH
 *
 * Auto-detected servers (if binary found in PATH):
 *   - typescript-language-server → .ts/.tsx/.js/.jsx
 *   - pylsp / pyright-langserver → .py
 *   - gopls → .go
 *   - rust-analyzer → .rs
 *   - solargraph → .rb
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { ScopedLspServerConfig } from './types'

function logForDebugging(msg: string) { if (process.env.QILING_DEBUG === '1') console.error('[LSP]', msg) }

// ─── Auto-detection configuration ────────────────────────────────────────────

type AutoDetectEntry = {
  command: string
  args: string[]
  extensionToLanguage: Record<string, string>
}

const AUTO_DETECT_SERVERS: AutoDetectEntry[] = [
  {
    command: 'typescript-language-server',
    args: ['--stdio'],
    extensionToLanguage: {
      '.ts': 'typescript', '.tsx': 'typescriptreact',
      '.js': 'javascript', '.jsx': 'javascriptreact',
    },
  },
  {
    command: 'pylsp',
    args: [],
    extensionToLanguage: { '.py': 'python' },
  },
  {
    command: 'pyright-langserver',
    args: ['--stdio'],
    extensionToLanguage: { '.py': 'python' },
  },
  {
    command: 'gopls',
    args: [],
    extensionToLanguage: { '.go': 'go' },
  },
  {
    command: 'rust-analyzer',
    args: [],
    extensionToLanguage: { '.rs': 'rust' },
  },
  {
    command: 'solargraph',
    args: ['stdio'],
    extensionToLanguage: { '.rb': 'ruby' },
  },
]

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

// ─── Settings-based configuration ────────────────────────────────────────────

type RawLspServerConfig = {
  command: string
  args?: string[]
  env?: Record<string, string>
  extensionToLanguage: Record<string, string>
  workspaceFolder?: string
  maxRestarts?: number
  startupTimeout?: number
  initializationOptions?: Record<string, unknown>
}

function loadSettingsLspServers(cwd: string): Record<string, RawLspServerConfig> {
  const settingsPaths = [
    join(cwd, '.qiling', 'settings.json'),
    join(homedir(), '.qiling', 'settings.json'),
  ]

  for (const settingsPath of settingsPaths) {
    if (!existsSync(settingsPath)) continue
    try {
      const raw = require('node:fs').readFileSync(settingsPath, 'utf-8')
      const settings = JSON.parse(raw) as Record<string, unknown>
      const lspServers = settings.lspServers
      if (lspServers && typeof lspServers === 'object') {
        return lspServers as Record<string, RawLspServerConfig>
      }
    } catch { /* ignore parse errors */ }
  }
  return {}
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Get all configured LSP servers.
 *
 * Priority:
 *   1. Servers from settings.json lspServers section
 *   2. Auto-detected servers (command found in PATH), for extensions not
 *      already covered by settings-based servers
 *
 * @returns Object containing servers configuration keyed by server name
 */
export async function getAllLspServers(cwd?: string): Promise<{
  servers: Record<string, ScopedLspServerConfig>
}> {
  const allServers: Record<string, ScopedLspServerConfig> = {}
  const coveredExtensions = new Set<string>()

  // Skip LSP in CI/non-interactive environments unless explicitly enabled
  if (process.env.CI && !process.env.QILING_ENABLE_LSP) {
    logForDebugging('LSP disabled in CI environment (set QILING_ENABLE_LSP=1 to enable)')
    return { servers: {} }
  }

  const workingDir = cwd ?? process.cwd()

  // 1. Settings-based servers (highest priority)
  const settingsServers = loadSettingsLspServers(workingDir)
  for (const [name, config] of Object.entries(settingsServers)) {
    allServers[name] = { ...config, workspaceFolder: config.workspaceFolder ?? workingDir }
    for (const ext of Object.keys(config.extensionToLanguage)) {
      coveredExtensions.add(ext.toLowerCase())
    }
    logForDebugging(`Loaded LSP server '${name}' from settings`)
  }

  // 2. Auto-detection (only for extensions not already covered)
  for (const entry of AUTO_DETECT_SERVERS) {
    const uncoveredExtensions = Object.keys(entry.extensionToLanguage)
      .filter(ext => !coveredExtensions.has(ext.toLowerCase()))

    if (uncoveredExtensions.length === 0) continue

    const found = await commandExists(entry.command)
    if (!found) continue

    const name = entry.command.replace(/-/g, '_')
    const filteredExtToLang: Record<string, string> = {}
    for (const ext of uncoveredExtensions) {
      filteredExtToLang[ext] = entry.extensionToLanguage[ext] ?? 'plaintext'
      coveredExtensions.add(ext.toLowerCase())
    }

    allServers[name] = {
      command: entry.command,
      args: entry.args,
      extensionToLanguage: filteredExtToLang,
      workspaceFolder: workingDir,
    }
    logForDebugging(`Auto-detected LSP server '${entry.command}' for extensions: ${uncoveredExtensions.join(', ')}`)
  }

  logForDebugging(`Total LSP servers: ${Object.keys(allServers).length}`)
  return { servers: allServers }
}
