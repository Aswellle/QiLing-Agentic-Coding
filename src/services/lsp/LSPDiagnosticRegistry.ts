/**
 * LSP Diagnostic Registry — direct port of CC's services/lsp/LSPDiagnosticRegistry.ts
 *
 * Stores LSP diagnostics received asynchronously from LSP servers via
 * textDocument/publishDiagnostics notifications for later delivery.
 *
 * Adaptations:
 *   - logForDebugging / logError / jsonStringify → inline helpers
 *   - DiagnosticFile → from ./types
 *   - lru-cache → same package
 */

import { randomUUID } from 'node:crypto'
import { LRUCache } from 'lru-cache'
import type { DiagnosticFile } from './types'

function logForDebugging(msg: string) { if (process.env.QILING_DEBUG === '1') console.error('[LSP]', msg) }
function logError(err: Error) { console.error('[LSP error]', err.message) }

export type PendingLSPDiagnostic = {
  serverName: string
  files: DiagnosticFile[]
  timestamp: number
  attachmentSent: boolean
}

// Volume limits
const MAX_DIAGNOSTICS_PER_FILE = 10
const MAX_TOTAL_DIAGNOSTICS = 30
const MAX_DELIVERED_FILES = 500

// Global state
const pendingDiagnostics = new Map<string, PendingLSPDiagnostic>()

const deliveredDiagnostics = new LRUCache<string, Set<string>>({
  max: MAX_DELIVERED_FILES,
})

export function registerPendingLSPDiagnostic({
  serverName,
  files,
}: {
  serverName: string
  files: DiagnosticFile[]
}): void {
  const diagnosticId = randomUUID()
  logForDebugging(`LSP Diagnostics: Registering ${files.length} diagnostic file(s) from ${serverName} (ID: ${diagnosticId})`)

  pendingDiagnostics.set(diagnosticId, {
    serverName,
    files,
    timestamp: Date.now(),
    attachmentSent: false,
  })
}

function generateDiagnosticKey(diag: { message: string; severity: string; range: { start: { line: number; character: number } } }): string {
  return `${diag.message}:${diag.severity}:${diag.range.start.line}:${diag.range.start.character}`
}

function isNewDiagnostic(uri: string, diagKey: string): boolean {
  const delivered = deliveredDiagnostics.get(uri)
  return !delivered || !delivered.has(diagKey)
}

function markDiagnosticDelivered(uri: string, diagKey: string): void {
  let delivered = deliveredDiagnostics.get(uri)
  if (!delivered) { delivered = new Set(); deliveredDiagnostics.set(uri, delivered) }
  delivered.add(diagKey)
}

export function checkForLSPDiagnostics(): PendingLSPDiagnostic[] {
  if (pendingDiagnostics.size === 0) return []

  const pending = Array.from(pendingDiagnostics.entries())
    .filter(([, d]) => !d.attachmentSent)
    .map(([id, d]) => ({ id, ...d }))

  pending.forEach(({ id }) => {
    const diag = pendingDiagnostics.get(id)
    if (diag) { diag.attachmentSent = true }
  })

  return pending
}

export function clearPendingLSPDiagnostics(): void {
  // Remove sent diagnostics, keep unsent ones
  for (const [id, d] of pendingDiagnostics.entries()) {
    if (d.attachmentSent) pendingDiagnostics.delete(id)
  }
}

/**
 * Get all pending diagnostics as formatted text for inclusion in tool results.
 * Returns null if no new diagnostics.
 */
export function getLSPDiagnosticsText(): string | null {
  const pending = checkForLSPDiagnostics()
  if (pending.length === 0) return null

  let totalCount = 0
  const sections: string[] = []

  for (const { serverName, files } of pending) {
    for (const file of files) {
      const newDiags = file.diagnostics
        .filter(d => {
          const key = generateDiagnosticKey(d)
          return isNewDiagnostic(file.uri, key)
        })
        .slice(0, MAX_DIAGNOSTICS_PER_FILE)

      if (newDiags.length === 0) continue
      if (totalCount + newDiags.length > MAX_TOTAL_DIAGNOSTICS) break

      for (const d of newDiags) {
        const key = generateDiagnosticKey(d)
        markDiagnosticDelivered(file.uri, key)
      }

      totalCount += newDiags.length
      const diagLines = newDiags.map(d =>
        `  [${d.severity}] Line ${d.range.start.line + 1}:${d.range.start.character + 1} — ${d.message}${d.source ? ` (${d.source})` : ''}`
      )
      sections.push(`${file.uri}\n${diagLines.join('\n')}`)
    }
  }

  clearPendingLSPDiagnostics()

  if (sections.length === 0) return null
  return `## LSP Diagnostics\n${sections.join('\n\n')}`
}

// FROM CC: clearAllLSPDiagnostics — clear pending only, preserve cross-turn dedup state
export function clearAllLSPDiagnostics(): void {
  logForDebugging(`LSP Diagnostics: Clearing ${pendingDiagnostics.size} pending diagnostic(s)`)
  pendingDiagnostics.clear()
}

// FROM CC: resetAllLSPDiagnosticState — full reset including cross-turn dedup (session reset/testing)
export function resetAllLSPDiagnosticState(): void {
  logForDebugging(`LSP Diagnostics: Resetting all state (${pendingDiagnostics.size} pending, ${deliveredDiagnostics.size} files tracked)`)
  pendingDiagnostics.clear()
  deliveredDiagnostics.clear()
}

// FROM CC: clearDeliveredDiagnosticsForFile — re-enable delivery for a file after it's been edited
export function clearDeliveredDiagnosticsForFile(fileUri: string): void {
  if (deliveredDiagnostics.has(fileUri)) {
    logForDebugging(`LSP Diagnostics: Clearing delivered diagnostics for ${fileUri}`)
    deliveredDiagnostics.delete(fileUri)
  }
}

// FROM CC: getPendingLSPDiagnosticCount — count of pending diagnostics for monitoring
export function getPendingLSPDiagnosticCount(): number {
  return pendingDiagnostics.size
}
