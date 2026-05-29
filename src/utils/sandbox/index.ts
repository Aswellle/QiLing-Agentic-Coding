/**
 * Sandbox Manager — adapted from CC's utils/sandbox/sandbox-adapter.ts
 *
 * CC uses @anthropic-ai/sandbox-runtime (macOS App Sandbox + Linux namespaces).
 * QiLing adaptation: lightweight stub that provides the same interface without
 * requiring platform-specific native modules. Full sandboxing can be enabled
 * via environment variables or settings.
 *
 * Sandbox modes:
 *   disabled  — no sandboxing (default, same as CC with sandbox off)
 *   firejail  — Linux firejail (if installed)
 *   docker    — wrap commands in Docker container
 *
 * Enable: QILING_SANDBOX=firejail or QILING_SANDBOX=docker
 * Or in settings.json: { "sandbox": { "enabled": true, "mode": "firejail" } }
 */

import { existsSync } from 'node:fs'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SandboxMode = 'disabled' | 'firejail' | 'docker'

export type SandboxConfig = {
  enabled: boolean
  mode: SandboxMode
  /** File paths allowed for read access (undefined = all) */
  allowedReadPaths?: string[]
  /** File paths allowed for write access (undefined = cwd only) */
  allowedWritePaths?: string[]
  /** Network domains allowed (undefined = all) */
  allowedDomains?: string[]
  /** Block network access entirely */
  blockNetwork?: boolean
}

export type SandboxViolationEvent = {
  type: 'fs_read' | 'fs_write' | 'network'
  path?: string
  domain?: string
  timestamp: number
}

// ─── State ────────────────────────────────────────────────────────────────────

const violations: SandboxViolationEvent[] = []

// ─── Detection ────────────────────────────────────────────────────────────────

function hasFirejail(): boolean {
  try {
    const proc = Bun.spawnSync(['which', 'firejail'], { stdout: 'pipe', stderr: 'pipe' })
    return proc.exitCode === 0
  } catch { return false }
}

function hasDocker(): boolean {
  try {
    const proc = Bun.spawnSync(['docker', '--version'], { stdout: 'pipe', stderr: 'pipe' })
    return proc.exitCode === 0
  } catch { return false }
}

// ─── Config resolution ────────────────────────────────────────────────────────

let _config: SandboxConfig | null = null

function getConfig(): SandboxConfig {
  if (_config) return _config

  const modeEnv = process.env.QILING_SANDBOX as SandboxMode | undefined

  if (!modeEnv || modeEnv === 'disabled') {
    _config = { enabled: false, mode: 'disabled' }
    return _config
  }

  _config = {
    enabled: true,
    mode: modeEnv,
    blockNetwork: process.env.QILING_SANDBOX_NO_NETWORK === '1',
    allowedReadPaths: process.env.QILING_SANDBOX_READ_PATHS?.split(':'),
    allowedWritePaths: process.env.QILING_SANDBOX_WRITE_PATHS?.split(':'),
  }
  return _config
}

// ─── Command wrapping ─────────────────────────────────────────────────────────

/**
 * Wrap a shell command with sandbox restrictions.
 * Returns the command unchanged if sandboxing is disabled.
 */
export async function wrapWithSandbox(
  command: string,
  cwd = process.cwd(),
): Promise<string> {
  const config = getConfig()
  if (!config.enabled) return command

  switch (config.mode) {
    case 'firejail':
      return buildFirejailCommand(command, config, cwd)
    case 'docker':
      return buildDockerCommand(command, config, cwd)
    default:
      return command
  }
}

function buildFirejailCommand(
  command: string,
  config: SandboxConfig,
  cwd: string,
): string {
  const args = ['firejail', '--quiet']

  if (config.blockNetwork) args.push('--net=none')
  if (config.allowedWritePaths?.length) {
    for (const p of config.allowedWritePaths) args.push(`--whitelist=${p}`)
  }
  args.push('--', 'bash', '-c', command)

  return args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')
}

function buildDockerCommand(
  command: string,
  config: SandboxConfig,
  cwd: string,
): string {
  const args = [
    'docker', 'run', '--rm',
    '--workdir', '/workspace',
    '-v', `${cwd}:/workspace`,
  ]

  if (config.blockNetwork) args.push('--network=none')
  args.push('alpine:latest', 'sh', '-c', command)

  return args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')
}

// ─── Public SandboxManager interface (CC-compatible) ──────────────────────────

export const SandboxManager = {
  /** Check if sandboxing is enabled */
  isSandboxingEnabled(): boolean {
    return getConfig().enabled
  },

  /** Check if the current platform supports sandboxing */
  isSupportedPlatform(): boolean {
    const config = getConfig()
    if (config.mode === 'firejail') return process.platform === 'linux' && hasFirejail()
    if (config.mode === 'docker') return hasDocker()
    return false
  },

  /** Get reason why sandboxing is unavailable (or null if available) */
  getSandboxUnavailableReason(): string | null {
    const config = getConfig()
    if (!config.enabled) return 'Sandbox disabled (set QILING_SANDBOX=firejail or QILING_SANDBOX=docker)'
    if (config.mode === 'firejail' && !hasFirejail()) return 'firejail not found in PATH'
    if (config.mode === 'docker' && !hasDocker()) return 'docker not found in PATH'
    return null
  },

  /** Wrap a command with sandbox restrictions */
  wrapWithSandbox,

  /** Get recorded sandbox violations */
  getViolations(): SandboxViolationEvent[] {
    return [...violations]
  },

  /** Clear violation history */
  clearViolations(): void {
    violations.length = 0
  },

  /** Reset config (useful after settings change) */
  reset(): void {
    _config = null
    violations.length = 0
  },

  /** Check sandbox dependencies are available */
  async checkDependencies(): Promise<{ available: boolean; missing: string[] }> {
    const config = getConfig()
    const missing: string[] = []

    if (config.mode === 'firejail' && !hasFirejail()) {
      missing.push('firejail (install: sudo apt install firejail)')
    }
    if (config.mode === 'docker' && !hasDocker()) {
      missing.push('docker (install: https://docs.docker.com/get-docker/)')
    }

    return { available: missing.length === 0, missing }
  },

  /** Get current sandbox config */
  getConfig,

  /** Auto-allow bash commands when sandboxed (CC-compat stub — always false in QiLing) */
  isAutoAllowBashIfSandboxedEnabled(): boolean {
    return false
  },

  /** Whether dangerouslyDisableSandbox is allowed by policy (CC-compat stub) */
  areUnsandboxedCommandsAllowed(): boolean {
    return true
  },

  /** Get filesystem write config for permission checking (CC-compat stub) */
  getFsWriteConfig(): { allowOnly: string[]; denyWithinAllow: string[] } {
    return { allowOnly: [], denyWithinAllow: [] }
  },

  /** Get filesystem read config (CC-compat stub) */
  getFsReadConfig(): { denyOnly?: string[]; allowWithinDeny?: string[] } {
    return {}
  },

  /** Get network restriction config (CC-compat stub) */
  getNetworkRestrictionConfig(): { allowedHosts?: string[]; deniedHosts?: string[] } | null {
    return null
  },

  /** Get allowed unix sockets (CC-compat stub) */
  getAllowUnixSockets(): string[] | undefined {
    return undefined
  },

  /** Get ignored violations config (CC-compat stub) */
  getIgnoreViolations(): unknown {
    return null
  },
}
