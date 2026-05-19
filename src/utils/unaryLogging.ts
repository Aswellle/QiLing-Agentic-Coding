/**
 * Unary (single-turn) completion event logging — adapted from CC's utils/unaryLogging.ts
 *
 * Tracks accept/reject events for inline completions. In QiLing this is a
 * no-op since we don't have CC's analytics sink, but the interface is preserved
 * for completeness.
 */

export type CompletionType =
  | 'str_replace_single'
  | 'str_replace_multi'
  | 'write_file_single'
  | 'tool_use_single'

type LogEvent = {
  completion_type: CompletionType
  event: 'accept' | 'reject' | 'response'
  metadata: {
    language_name: string | Promise<string>
    message_id: string
    platform: string
    hasFeedback?: boolean
  }
}

/**
 * Log a unary completion event (no-op in QiLing — no analytics sink).
 * Preserved for CC API compatibility.
 */
export async function logUnaryEvent(_event: LogEvent): Promise<void> {
  // No-op: QiLing doesn't have CC's telemetry infrastructure
}
