import type { Message, TokenUsage } from './message'
import type { ToolDefinition } from './tool'

export interface ProviderConfig {
  name: string
  displayName: string
  model: string
  apiKey?: string
  endpoint?: string
  maxTokens?: number
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
