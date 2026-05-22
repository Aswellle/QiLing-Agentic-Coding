/**
 * Query dependency injection — adapted from CC's query/deps.ts
 *
 * Provides injectable dependencies for the query loop so tests can swap
 * implementations without module-level spying. QiLing version wires to
 * QiLing's compact engine and provider abstraction.
 *
 * CC has 4 injectable deps; QiLing maintains the same contract so tests
 * can override any combination without side effects.
 */

import { randomUUID } from 'crypto'
import { microcompact } from '../compact/engine.js'
import { shouldAutoCompact } from '../compact/autoCompact.js'
import type { Message } from '../types/message.js'
import type { Provider } from '../types/provider.js'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Signature of QiLing's streaming model call */
export type CallModelFn = (
  provider: Provider,
  messages: Message[],
  options: Record<string, unknown>,
  signal?: AbortSignal,
) => AsyncGenerator<unknown>

/** Signature of QiLing's microcompact */
export type MicrocompactFn = typeof microcompact

/** Signature of QiLing's autocompact check */
export type AutocompactFn = typeof shouldAutoCompact

export type QueryDeps = {
  /** Streaming model call */
  callModel: CallModelFn
  /** Single-turn message compression */
  microcompact: MicrocompactFn
  /** Whether to trigger autocompact after turn */
  autocompact: AutocompactFn
  /** UUID factory (injectable for deterministic tests) */
  uuid: () => string
}

// ─── Production factory ───────────────────────────────────────────────────────

/**
 * Returns the live production deps wired to QiLing's real implementations.
 * Import lazily to avoid circular initialisation in modules that only need
 * the type.
 */
export function productionDeps(): QueryDeps {
  // callModel is provider-specific; return a placeholder that defers to the
  // provider passed at call-site. The real dispatch happens inside query.ts.
  const callModel: CallModelFn = async function* (_provider, _messages, _options, _signal) {
    // Real call happens in query.ts via provider.stream()
    yield* []
  }

  return {
    callModel,
    microcompact,
    autocompact: shouldAutoCompact,
    uuid: randomUUID,
  }
}
