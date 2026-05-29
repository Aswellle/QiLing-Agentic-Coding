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
}

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
