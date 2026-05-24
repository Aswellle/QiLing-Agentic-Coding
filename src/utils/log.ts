/**
 * Logging utilities — adapted from CC's utils/log.ts
 *
 * CC version: pluggable error log sink for UI, in-memory error queue, MCP logging.
 * QiLing version: focused on the portable parts — logError, logForDebugging,
 * MCP-specific logging, and error display helpers.
 *
 * In QiLing, logForDebugging writes to stderr only when QILING_DEBUG=1.
 * logError writes to stderr always.
 */

// FROM CC: dateToFilename — ISO timestamp → filesystem-safe filename
export function dateToFilename(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-')
}

// ─── Core logging ─────────────────────────────────────────────────────────────

/**
 * Log an error to stderr. Equivalent to CC's logError().
 * Also stores errors in memory for /doctor and error display.
 */
export function logError(error: unknown): void {
  const err = toError(error)
  const message = err.stack ?? err.message ?? String(error)
  console.error('[qiling error]', message)
  storeInMemory(message)
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error(String(error))
}

/**
 * Debug logging — only writes when QILING_DEBUG=1.
 * Equivalent to CC's logForDebugging().
 */
export function logForDebugging(message: string, _opts?: { level?: string }): void {
  if (process.env.QILING_DEBUG === '1') {
    console.error('[qiling debug]', message)
  }
}

// ─── In-memory error queue ────────────────────────────────────────────────────

const MAX_IN_MEMORY_ERRORS = 50

const _inMemoryErrors: Array<{ error: string; timestamp: string }> = []

function storeInMemory(message: string): void {
  _inMemoryErrors.push({
    error: message.slice(0, 2000),
    timestamp: new Date().toISOString(),
  })
  while (_inMemoryErrors.length > MAX_IN_MEMORY_ERRORS) {
    _inMemoryErrors.shift()
  }
}

export function getInMemoryErrors(): Array<{ error: string; timestamp: string }> {
  return [..._inMemoryErrors]
}

export function _resetErrorLogForTesting(): void {
  _inMemoryErrors.length = 0
}

// ─── MCP logging ──────────────────────────────────────────────────────────────

/**
 * Log an MCP server error. Prefixes with server name for easy filtering.
 */
export function logMCPError(serverName: string, error: unknown): void {
  const err = toError(error)
  console.error(`[MCP:${serverName}] error:`, err.message)
  storeInMemory(`[MCP:${serverName}] ${err.message}`)
}

/**
 * Debug log for MCP server events (only when QILING_DEBUG=1).
 */
export function logMCPDebug(serverName: string, message: string): void {
  if (process.env.QILING_DEBUG === '1') {
    console.error(`[MCP:${serverName}]`, message)
  }
}

// ─── Display title extraction ─────────────────────────────────────────────────

/**
 * Extract a human-readable title from a session log entry.
 * Used by /history command to show session titles.
 *
 * Priority: customTitle > firstPrompt > defaultTitle > 'Untitled session'
 */
export function getLogDisplayTitle(
  log: {
    firstPrompt?: string
    customTitle?: string
    [key: string]: unknown
  },
  defaultTitle?: string,
): string {
  if (log.customTitle) return log.customTitle

  if (log.firstPrompt) {
    const prompt = log.firstPrompt.trim()
    // Skip system/meta messages
    if (prompt.startsWith('<') || prompt.length === 0) {
      return defaultTitle ?? 'Untitled session'
    }
    // Take first line, max 60 chars
    const firstLine = prompt.split('\n')[0]?.trim() ?? ''
    return firstLine.length > 60 ? firstLine.slice(0, 59) + '…' : firstLine
  }

  return defaultTitle ?? 'Untitled session'
}
