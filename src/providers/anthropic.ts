import Anthropic from '@anthropic-ai/sdk'
import type { Provider, ProviderConfig, StreamOptions, StreamChunkType } from '../types/provider'
import type { Message, TokenUsage } from '../types/message'
import type { ToolDefinition } from '../types/tool'

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  'claude-opus-4-7': 200_000,
  'claude-sonnet-4-6': 200_000,
  'claude-haiku-4-5-20251001': 200_000,
  'claude-3-5-sonnet-20241022': 200_000,
  'claude-3-5-haiku-20241022': 200_000,
  'claude-3-opus-20240229': 200_000,
}

export class AnthropicProvider implements Provider {
  readonly config: ProviderConfig
  private client: Anthropic

  constructor(config: ProviderConfig) {
    this.config = config
    this.client = new Anthropic({
      apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY,
      baseURL: config.endpoint,
    })
  }

  async *stream(
    messages: Message[],
    tools: ToolDefinition[],
    options: StreamOptions = {}
  ): AsyncGenerator<StreamChunkType> {
    // ── Prompt cache injection ────────────────────────────────────────────
    // Inject cache_control on system prompt and first 2 user messages.
    // This gives 80-90% cost reduction on repeated queries (cache hits).
    // Only Claude 3.5+ supports ephemeral caching.
    const supportsCaching = (
      this.config.model.includes('claude-3') ||
      this.config.model.includes('claude-sonnet') ||
      this.config.model.includes('claude-opus') ||
      this.config.model.includes('claude-haiku')
    )

    // Build system prompt with cache_control
    const systemWithCache = supportsCaching && options.systemPrompt
      ? [{ type: 'text' as const, text: options.systemPrompt, cache_control: { type: 'ephemeral' as const } }]
      : options.systemPrompt

    // Mark first 2 user messages (likely to be repeated context) as cacheable
    let cacheInserted = 0
    const anthropicMessages = messages.map((msg, idx) => {
      const base = { role: msg.role, content: typeof msg.content === 'string' ? msg.content : msg.content }
      // Cache the first 2 user messages (usually context/memory) and tools block
      if (supportsCaching && msg.role === 'user' && cacheInserted < 2 && idx < 4) {
        cacheInserted++
        const rawContent = msg.content as unknown
        const content = typeof msg.content === 'string'
          ? [{ type: 'text' as const, text: msg.content, cache_control: { type: 'ephemeral' as const } }]
          : (rawContent as Array<Record<string, unknown>>).map((block, i) =>
              i === (rawContent as unknown[]).length - 1
                ? { ...block, cache_control: { type: 'ephemeral' as const } }
                : block
            )
        return { ...base, content }
      }
      return base
    }) as Anthropic.MessageParam[]

    try {
      // Extended thinking support (Claude 3.5+ / 3 Opus)
      const thinkingConfig = (options as { thinking?: { type: string; budget_tokens: number } }).thinking
      const supportsThinking = this.config.model.includes('opus') || this.config.model.includes('sonnet-4')

      // Also cache the tools definition (rarely changes across turns)
      const toolsWithCache = supportsCaching && tools.length > 0
        ? tools.map((t, i) => i === tools.length - 1
            ? { ...t, cache_control: { type: 'ephemeral' } }
            : t
          ) as Anthropic.Tool[]
        : tools.length > 0 ? (tools as Anthropic.Tool[]) : undefined

      const stream = await this.client.messages.stream({
        model: this.config.model,
        max_tokens: options.maxTokens ?? this.config.maxTokens ?? 8096,
        system: systemWithCache as Anthropic.MessageStreamParams['system'],
        messages: anthropicMessages,
        tools: toolsWithCache,
        temperature: thinkingConfig ? undefined : options.temperature,
        ...(thinkingConfig && supportsThinking ? {
          thinking: { type: 'enabled', budget_tokens: thinkingConfig.budget_tokens },
        } : {}),
      } as Parameters<typeof this.client.messages.stream>[0])

      // BUG FIX: Anthropic SDK sends content_block_delta with event.index (not id).
      // We must map index → tool_use_id to correctly correlate delta/stop events.
      const indexToId = new Map<number, string>()
      const toolInputAccumulators = new Map<string, string>() // id → accumulated JSON

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            const { id, name } = event.content_block
            indexToId.set(event.index, id)
            toolInputAccumulators.set(id, '')
            yield { type: 'tool_use_start', id, name }
          }

        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            yield { type: 'text_delta', text: event.delta.text }

          } else if (event.delta.type === 'input_json_delta') {
            const id = indexToId.get(event.index)
            if (id !== undefined) {
              const existing = toolInputAccumulators.get(id) ?? ''
              toolInputAccumulators.set(id, existing + event.delta.partial_json)
              yield { type: 'tool_use_delta', id, inputDelta: event.delta.partial_json }
            }
          }

        } else if (event.type === 'content_block_stop') {
          const id = indexToId.get(event.index)
          if (id !== undefined && toolInputAccumulators.has(id)) {
            yield { type: 'tool_use_stop', id }
          }
        }
        // message_delta and message_stop handled via finalMessage below
      }

      const finalMessage = await stream.finalMessage()
      const usage: TokenUsage = {
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
        cacheReadTokens:
          (finalMessage.usage as { cache_read_input_tokens?: number })
            .cache_read_input_tokens ?? 0,
        cacheWriteTokens:
          (finalMessage.usage as { cache_creation_input_tokens?: number })
            .cache_creation_input_tokens ?? 0,
      }
      yield { type: 'stop', stopReason: finalMessage.stop_reason ?? 'end_turn', usage }

    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  countTokens(messages: Message[]): number {
    const text = messages
      .map(m => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
      .join('\n')
    return Math.ceil(text.length / 4)
  }

  getContextWindow(): number {
    return MODEL_CONTEXT_WINDOWS[this.config.model] ?? 200_000
  }
}
