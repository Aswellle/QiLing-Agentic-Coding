/**
 * Claude Code hints protocol — adapted from CC's utils/claudeCodeHints.ts
 *
 * CLIs/SDKs running under QiLing can emit `<claude-code-hint />` tags to
 * stderr. The harness scans tool output, strips these tags before the model
 * sees them, and surfaces an install/action prompt to the user.
 *
 * Format: <claude-code-hint v="1" type="plugin" value="name@marketplace" />
 * Must appear on its own line (whitespace-trimmed). Leading/trailing whitespace
 * on the line is tolerated.
 *
 * This file: parser + single-slot store (useSyncExternalStore interface).
 * Single slot: write wins if full. Dialog shown at most once per session.
 */

import { logForDebugging } from './log.js'
import { createSignal } from './signal.js'

export type ClaudeCodeHintType = 'plugin'

export type ClaudeCodeHint = {
  /** Spec version declared by the emitter. Unknown versions are dropped. */
  v: number
  /** Hint discriminator. v1 defines only 'plugin'. */
  type: ClaudeCodeHintType
  /**
   * Hint payload. For type='plugin': a `name@marketplace` slug
   * matching the form accepted by parsePluginIdentifier.
   */
  value: string
  /** First token of the shell command that produced this hint. */
  sourceCommand: string
}

const SUPPORTED_VERSIONS = new Set([1])
const SUPPORTED_TYPES = new Set<string>(['plugin'])

const HINT_TAG_RE = /^[ \t]*<claude-code-hint\s+([^>]*?)\s*\/>[ \t]*$/gm
const ATTR_RE = /(\w+)=(?:"([^"]*)"|([^\s/>]+))/g

function parseAttrs(line: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  ATTR_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = ATTR_RE.exec(line)) !== null) {
    const key = match[1]
    const value = match[2] ?? match[3] ?? ''
    if (key) attrs[key] = value
  }
  return attrs
}

function firstCommandToken(command: string): string {
  return command.trim().split(/\s+/)[0] ?? ''
}

/**
 * Scan shell tool output for hint tags.
 * Returns parsed hints and the output with hint lines removed.
 * The stripped output is what the model sees — hints are a harness-only side channel.
 */
export function extractClaudeCodeHints(
  output: string,
  command: string,
): { hints: ClaudeCodeHint[]; stripped: string } {
  if (!output.includes('<claude-code-hint')) {
    return { hints: [], stripped: output }
  }

  const sourceCommand = firstCommandToken(command)
  const hints: ClaudeCodeHint[] = []

  const stripped = output.replace(HINT_TAG_RE, rawLine => {
    const attrs = parseAttrs(rawLine)
    const v = Number(attrs.v)
    const type = attrs.type
    const value = attrs.value

    if (!SUPPORTED_VERSIONS.has(v)) {
      logForDebugging(`[claudeCodeHints] dropped hint with unsupported v=${attrs.v}`)
      return ''
    }
    if (!type || !SUPPORTED_TYPES.has(type)) {
      logForDebugging(`[claudeCodeHints] dropped hint with unsupported type=${type}`)
      return ''
    }
    if (!value) {
      logForDebugging(`[claudeCodeHints] dropped hint with empty value`)
      return ''
    }

    hints.push({ v, type: type as ClaudeCodeHintType, value, sourceCommand })
    return ''
  })

  // FROM CC: collapse blank lines introduced by removing hint lines
  const collapsed =
    hints.length > 0 || stripped !== output
      ? stripped.replace(/\n{3,}/g, '\n\n')
      : stripped

  return { hints, stripped: collapsed }
}

// ─── Pending-hint store (useSyncExternalStore) ────────────────────────────────

let pendingHint: ClaudeCodeHint | null = null
let shownThisSession = false
const pendingHintChanged = createSignal()

export function setPendingHint(hint: ClaudeCodeHint): void {
  if (shownThisSession) return
  pendingHint = hint
  pendingHintChanged.emit()
}

export function clearPendingHint(): void {
  if (pendingHint !== null) {
    pendingHint = null
    pendingHintChanged.emit()
  }
}

export function markShownThisSession(): void {
  shownThisSession = true
}

export const subscribeToPendingHint = pendingHintChanged.subscribe

export function getPendingHintSnapshot(): ClaudeCodeHint | null {
  return pendingHint
}

export function hasShownHintThisSession(): boolean {
  return shownThisSession
}

/** @internal — for tests */
export function _resetClaudeCodeHintStore(): void {
  pendingHint = null
  shownThisSession = false
}

// FROM CC: _test — expose private helpers for unit tests
export const _test = {
  parseAttrs,
  firstCommandToken,
}
