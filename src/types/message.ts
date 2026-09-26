export type Role = 'user' | 'assistant'

export interface TextContent {
  type: 'text'
  text: string
}

export interface ImageContent {
  type: 'image'
  source: {
    type: 'base64'
    media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    data: string
  }
}

export interface ToolUseContent {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultContent {
  type: 'tool_result'
  tool_use_id: string
  content: string | TextContent[]
  is_error?: boolean
}

export type ContentBlock = TextContent | ImageContent | ToolUseContent | ToolResultContent

export interface Message {
  role: Role
  content: string | ContentBlock[]
  /**
   * Internal loop messages (recovery messages, tool summaries, budget nudges)
   * that should NOT be displayed to the user in the conversation.
   * Mirrors CC's isMeta: true pattern on createUserMessage.
   */
  isMeta?: true
  /**
   * Unique message identifier for session storage and file history checkpoints.
   * Auto-assigned by the loop or by message creation helpers.
   */
  uuid?: string
  /**
   * Set on assistant messages that represent API error conditions
   * (max_tokens, prompt_too_long). Allows the UI to display them differently.
   */
  isApiErrorMessage?: boolean
  apiError?: 'max_output_tokens' | 'prompt_too_long' | 'invalid_request'
  // FROM CC compat: optional fields written by agentToolUtils/finalizeAgentTool
  // and forkedAgent. These are set at runtime by the API response pipeline.
  /** CC: message.usage — API token usage for this message */
  usage?: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens: number | null
    cache_read_input_tokens: number | null
  }
  /** CC: message.requestId — API request correlation ID */
  requestId?: string
  /** CC: message.id — unique message ID for analytics */
  id?: string
  /** CC: message.type — CC's stream message discriminator ('assistant' |
   *  'user' | 'progress' | 'stream_event' | ...). QiLing discriminates on
   *  `role`; CC-ported loop code (forkedAgent, runAgent) reads this. */
  type?: string
  /** CC: system message subtype (e.g. 'compact_boundary') */
  subtype?: string
}

// ─── CC message-shape compat aliases ──────────────────────────────────────────
// CC wraps the API message in `message.message`; QiLing flattens it. These
// aliases let CC-ported code (runAgent, forkedAgent) keep its casts while the
// runtime objects are QiLing Messages with the compat fields above.

export type UserMessage = Message & {
  type: 'user'
  message: { content: string | ContentBlock[] }
}

export type AssistantMessage = Message & {
  type: 'assistant'
  message: { content: ContentBlock[] }
}

export type StreamEvent = Message & {
  type: 'stream_event'
  event?: { type?: string; usage?: unknown }
}

export type RequestStartEvent = Message & { type: 'stream_request_start' }

export type SystemCompactBoundaryMessage = Message & {
  type: 'system'
  subtype: 'compact_boundary'
}

export type TombstoneMessage = Message & { type: 'tombstone' }

export type ToolUseSummaryMessage = Message & { type: 'tool_use_summary' }

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

// FROM CC: types/message.ts
// Generic progress message emitted during tool execution. Each tool defines
// its own progress data type P (must have a discriminant `type` field).
export type ProgressMessage<P extends { type: string } = { type: string }> = {
  type: 'progress'
  data: P
  toolUseID: string
  parentToolUseID: string
  uuid: string
  timestamp: string
}

// FROM CC: MessageOrigin — CC's types/message.ts was not restored in the
// sourcemap; this union is reconstructed from its usage sites
// (utils/messages.ts wrapCommandText switch + queued_command attachment).
// Provenance of a message. undefined = human (keyboard).
export type MessageOrigin =
  | { kind: 'human' }
  | { kind: 'task-notification' }
  | { kind: 'coordinator' }
  | { kind: 'channel'; server: string }
