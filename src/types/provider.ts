import type { Message, TokenUsage } from './message'
import type { ToolDefinition } from './tool'

export interface ProviderConfig {
  name: string
  displayName: string
  model: string
  apiKey?: string
  endpoint?: string
  maxTokens?: number
  /** Effort level — controls extended thinking token budget for supported models */
  effortLevel?: 'low' | 'medium' | 'high' | 'max'
}

export interface StreamOptions {
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
}

export type StreamChunkType =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_use_start'; id: string; name: string }
  | { type: 'tool_use_delta'; id: string; inputDelta: string }
  | { type: 'tool_use_stop'; id: string }
  | { type: 'stop'; stopReason: string; usage: TokenUsage }
  | { type: 'error'; error: string }
  /** Thinking block (extended thinking mode) — carries the full thinking text
   *  and its signature. Must be preserved in assistant content for multi-turn
   *  conversations with thinking enabled. Mirrors CC's thinking block rules. */
  | { type: 'thinking_block'; thinking: string; signature: string }

export interface Provider {
  config: ProviderConfig

  /** Optionally list available models from this provider's API */
  getModels?(): Promise<string[]>

  stream(
    messages: Message[],
    tools: ToolDefinition[],
    options?: StreamOptions
  ): AsyncGenerator<StreamChunkType>

  countTokens(messages: Message[]): number
  getContextWindow(): number
}
