/**
 * Stop hook execution — adapted from CC's query/stopHooks.ts
 *
 * CC version (474L) includes: Stop hooks, extractMemories, autoDream,
 * PromptSuggestion, teammate-idle hooks — most gated behind ANT feature flags.
 *
 * QiLing version: implements Stop hook execution using QiLing's hook
 * infrastructure. ANT-specific features (extractMemories, autoDream,
 * promptSuggestion, teammate hooks) are no-op stubs, clearly marked for
 * Phase D when QiLing develops its own equivalents.
 *
 * improved: QiLing extracts this from query.ts into its own module so the
 * stop hook logic is independently testable (CC keeps it inline).
 */

import type { Message } from '../types/message.js'
import type { HooksConfig } from '../hooks/index.js'
import { runHooks } from '../hooks/index.js'
import { logForDebugging } from '../utils/log.js'
import { getCwd } from '../utils/cwd.js'
import { getSessionId } from '../bootstrap/state.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type StopHookContext = {
  workingDir: string
  sessionId: string
}

export type StopHookResult = {
  /** Messages that block the query loop from continuing (CC stop_hook_blocking) */
  blockingErrors: Message[]
  /** When true, the query loop must not re-enter after stop hooks */
  preventContinuation: boolean
}

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Run Stop hooks and return blocking result.
 *
 * Mirrors CC's runStopHooksWithBlocking but extracted as a standalone export
 * so query.ts stays lean and tests can inject mock hooks.
 */
export async function runStopHooksWithBlocking(
  hooks: HooksConfig | undefined,
  context: StopHookContext,
  _messages: Message[],
): Promise<StopHookResult> {
  try {
    const result = await runHooks('Stop', hooks, {
      toolName: '',
      input: {},
      workingDir: context.workingDir,
      sessionId: context.sessionId,
    })

    if (result.blocked) {
      logForDebugging(`[stopHooks] Stop hook blocked: ${result.reason ?? 'no reason'}`)
      // Blocking errors in CC surface as system messages; QL returns empty
      // array for now since blocking re-entry UI is not yet implemented.
      return { blockingErrors: [], preventContinuation: true }
    }
  } catch (err) {
    // Hook errors are non-fatal — log and continue
    logForDebugging(`[stopHooks] Stop hook error (non-fatal): ${err}`)
  }

  return { blockingErrors: [], preventContinuation: false }
}

/**
 * Convenience wrapper using current session state.
 * Equivalent to CC's handleStopHooks generator (simplified — no stream events).
 */
export async function handleStopHooks(
  messages: Message[],
  hooks: HooksConfig | undefined,
  workingDir?: string,
): Promise<StopHookResult> {
  const context: StopHookContext = {
    workingDir: workingDir ?? getCwd(),
    sessionId: getSessionId(),
  }
  const result = await runStopHooksWithBlocking(hooks, context, messages)

  // ── ANT-specific features (no-op stubs) ───────────────────────────────────
  // Phase D candidates when QiLing develops equivalent features:
  //   - extractMemories: auto-extract facts from conversation
  //   - autoDream: background reflection/planning
  //   - promptSuggestion: speculative next-prompt generation
  //   - teammateIdle: notify Swarm teammates of idle state
  //   - taskCompleted: fire task-completion hooks for background tasks

  return result
}
