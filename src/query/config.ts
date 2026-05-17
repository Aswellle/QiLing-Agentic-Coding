/**
 * Query configuration — adapted from CC's query/config.ts
 *
 * Immutable configuration snapshot taken at query() entry.
 * Separates per-query config from mutable state to make the query
 * loop more predictable.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type QueryConfig = {
  /** Unique session identifier */
  sessionId: string

  /** Runtime feature gates */
  gates: {
    /** Whether to execute tools concurrently during streaming */
    streamingToolExecution: boolean
    /** Whether to emit tool-use summaries between turns */
    emitToolUseSummaries: boolean
    /** Whether running in YOLO/bypass-permissions mode */
    yoloMode: boolean
    /** Whether in fast mode (fastest available model) */
    fastModeEnabled: boolean
  }

  /** Max tool rounds before stopping */
  maxRounds: number
}

// ─── Builder ──────────────────────────────────────────────────────────────────

/**
 * Build a QueryConfig snapshot for the current query() invocation.
 * Called once at the start of each query to avoid re-reading env vars mid-loop.
 */
export function buildQueryConfig(options?: {
  sessionId?: string
  maxRounds?: number
}): QueryConfig {
  return {
    sessionId: options?.sessionId ?? `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,

    gates: {
      streamingToolExecution: process.env.QILING_STREAMING_TOOLS !== '0',
      emitToolUseSummaries: process.env.QILING_EMIT_TOOL_SUMMARIES === '1',
      yoloMode: process.env.QILING_YOLO === '1',
      fastModeEnabled: process.env.QILING_FAST_MODE === '1',
    },

    maxRounds: options?.maxRounds ?? 20,
  }
}

// ─── Gate helpers ─────────────────────────────────────────────────────────────

export function isStreamingToolExecutionEnabled(config: QueryConfig): boolean {
  return config.gates.streamingToolExecution
}

export function isYoloMode(config: QueryConfig): boolean {
  return config.gates.yoloMode
}
