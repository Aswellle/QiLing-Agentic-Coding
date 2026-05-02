/**
 * Context Collapse — port of CC's services/contextCollapse/
 *
 * Folds old tool_use / tool_result pairs into compact summary text blocks,
 * preserving semantic context without token cost.
 *
 * Unlike microcompact (which truncates content) or autoCompact (which summarises
 * everything with AI), contextCollapse is a cheap, lossless-ish middle ground:
 *   - Keeps the last KEEP_FULL_ROUNDS exchanges fully intact
 *   - Collapses earlier tool rounds into one-line summaries
 *   - Zero AI calls — summaries are generated deterministically
 *   - Survives further compact rounds (summaries are plain text blocks)
 *
 * CC docs: "collapsed view is a read-time projection over the REPL's full history.
 * Summary messages live in the collapse store, not the REPL array."
 *
 * QiLing simplification: we mutate workingMessages in query.ts directly (no
 * separate projection layer) since we don't need REPL scroll-back preservation.
 */

import type { Message, ContentBlock } from '../../types/message'

const KEEP_FULL_ROUNDS = 6        // Keep this many recent tool rounds intact
const MIN_ROUNDS_TO_COLLAPSE = 3  // Don't bother if fewer rounds exist

// ─── Round detection ──────────────────────────────────────────────────────────

interface ToolRound {
  /** Index of the assistant message that triggered the tools */
  assistantIdx: number
  /** Index of the user message with tool_results */
  resultsIdx: number
  /** Tool names used in this round */
  toolNames: string[]
  /** Brief summary of what happened */
  summary: string
}

function detectToolRounds(messages: Message[]): ToolRound[] {
  const rounds: ToolRound[] = []

  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i]!
    if (msg.role !== 'assistant') continue
    if (typeof msg.content === 'string') continue

    const toolUses = (msg.content as ContentBlock[]).filter(b => b.type === 'tool_use')
    if (toolUses.length === 0) continue

    // Next message should be user with tool_results
    const next = messages[i + 1]
    if (!next || next.role !== 'user') continue
    if (typeof next.content === 'string') continue

    const results = (next.content as ContentBlock[]).filter(b => b.type === 'tool_result')
    if (results.length === 0) continue

    const toolNames = toolUses.map(b => (b as { type: 'tool_use'; name: string }).name)
    const summary = summariseRound(toolNames, toolUses)

    rounds.push({ assistantIdx: i, resultsIdx: i + 1, toolNames, summary })
  }

  return rounds
}

function summariseRound(names: string[], blocks: ContentBlock[]): string {
  // Build a one-line summary like "Read auth.ts, ran tests, edited config.json"
  const parts: string[] = []

  for (const block of blocks) {
    if (block.type !== 'tool_use') continue
    const b = block as { type: 'tool_use'; name: string; input: Record<string, unknown> }
    const inp = b.input ?? {}

    const desc = (() => {
      switch (b.name) {
        case 'FileRead':    return `read ${shorten(String(inp.file_path ?? inp.path ?? ''))}`
        case 'FileWrite':   return `wrote ${shorten(String(inp.file_path ?? ''))}`
        case 'FileEdit':    return `edited ${shorten(String(inp.file_path ?? ''))}`
        case 'Glob':        return `glob ${shorten(String(inp.pattern ?? ''))}`
        case 'Grep':        return `grep "${shorten(String(inp.pattern ?? ''), 20)}"`
        case 'Bash':        return `ran: ${shorten(String(inp.command ?? ''), 40)}`
        case 'PowerShell':  return `pwsh: ${shorten(String(inp.command ?? ''), 40)}`
        case 'WebFetch':    return `fetched ${shorten(String(inp.url ?? ''))}`
        case 'WebSearch':   return `searched "${shorten(String(inp.query ?? ''), 30)}"`
        case 'Agent':       return `spawned agent`
        case 'TodoWrite':   return `updated tasks`
        default:            return b.name.replace(/Tool$/, '').toLowerCase()
      }
    })()

    if (desc && !parts.includes(desc)) parts.push(desc)
  }

  return parts.join(', ') || names.join(', ')
}

function shorten(s: string, max = 30): string {
  const base = s.split('/').pop() ?? s  // use filename not full path
  return base.length <= max ? base : base.slice(0, max - 1) + '…'
}

// ─── Collapse ─────────────────────────────────────────────────────────────────

/**
 * Collapse old tool rounds into summary text blocks.
 * Returns the modified message array (or original if nothing to collapse).
 *
 * Called in query.ts before each iteration (step 2, after autoCompact check).
 */
export function applyCollapsesIfNeeded(messages: Message[]): Message[] {
  const rounds = detectToolRounds(messages)

  if (rounds.length < MIN_ROUNDS_TO_COLLAPSE) return messages

  // How many rounds to collapse (leave KEEP_FULL_ROUNDS intact)
  const toCollapse = rounds.length - KEEP_FULL_ROUNDS
  if (toCollapse <= 0) return messages

  const collapseRounds = rounds.slice(0, toCollapse)

  // Collect indices to replace
  const toRemove = new Set<number>()
  for (const r of collapseRounds) {
    toRemove.add(r.assistantIdx)
    toRemove.add(r.resultsIdx)
  }

  // Build the collapsed summary block
  const collapsedLines = collapseRounds.map(r =>
    `• Turn ${r.assistantIdx / 2 + 1}: ${r.summary}`
  )
  const summaryBlock: Message = {
    role: 'user',
    content: `[Context collapsed — ${collapseRounds.length} earlier tool round(s) summarised to save tokens]\n\n${collapsedLines.join('\n')}`,
  }

  // Reconstruct message array
  const result: Message[] = [summaryBlock]
  for (let i = 0; i < messages.length; i++) {
    if (!toRemove.has(i)) result.push(messages[i]!)
  }

  return result
}

/**
 * Recover from a prompt-too-long by collapsing more rounds.
 * More aggressive than normal collapse — collapses all but KEEP_FULL_ROUNDS/2 rounds.
 */
export function recoverFromOverflow(messages: Message[]): {
  messages: Message[]
  committed: number
} {
  const rounds = detectToolRounds(messages)
  const keepRounds = Math.max(2, Math.floor(KEEP_FULL_ROUNDS / 2))
  const toCollapse = rounds.length - keepRounds

  if (toCollapse <= 0) return { messages, committed: 0 }

  const collapseRounds = rounds.slice(0, toCollapse)
  const toRemove = new Set<number>()
  for (const r of collapseRounds) {
    toRemove.add(r.assistantIdx)
    toRemove.add(r.resultsIdx)
  }

  const summaryBlock: Message = {
    role: 'user',
    content: `[Emergency context collapse — ${collapseRounds.length} tool round(s) folded]\n\n${collapseRounds.map(r => `• ${r.summary}`).join('\n')}`,
  }

  const result: Message[] = [summaryBlock]
  for (let i = 0; i < messages.length; i++) {
    if (!toRemove.has(i)) result.push(messages[i]!)
  }

  return { messages: result, committed: collapseRounds.length }
}
