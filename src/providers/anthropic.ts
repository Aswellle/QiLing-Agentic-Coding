import Anthropic from '@anthropic-ai/sdk'
import type { Provider, ProviderConfig, StreamOptions, StreamChunkType } from '../types/provider'
import type { Message, TokenUsage } from '../types/message'
import type { ToolDefinition } from '../types/tool'
import { modelSupportsEffort, getEffortThinkingBudget, resolveEffortLevel } from '../utils/effort'
import { FallbackTriggeredError } from '../utils/errors'

// ─── Fallback model resolution (CC's model fallback pattern) ──────────────────
// Opus overloaded → try Sonnet; Sonnet/Haiku overloaded → no fallback
function resolveFallbackModel(model: string): string | null {
  if (model?.includes('opus')) return 'claude-sonnet-4-6'
  return null
}

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  'claude-opus-4-7': 200_000,
  'claude-opus-4-6': 200_000,  // Fast mode version
  'claude-opus-4-5': 200_000,
  'claude-opus-4-1': 200_000,
  'claude-sonnet-4-6': 200_000,
  'claude-haiku-4-5-20251001': 200_000,
  'claude-3-7-sonnet-20250219': 200_000,
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
    // ── Prompt cache injection (CC's single-marker-at-last-user-message) ────
    // Strategy (ported from CC's addCacheBreakpoints):
    //   - System prompt: always cached (stable, rarely changes)
    //   - Tool definitions: last tool gets cache_control (stable set)
    //   - Messages: EXACTLY ONE cache_control marker on the LAST user message
    //     This is CC's proven approach: each new turn extends the cached prefix
    //     to the most recent user message, maximising cache hits.
    // CC's getPromptCachingEnabled(): respect DISABLE_PROMPT_CACHING env var
    const cachingGloballyDisabled = process.env.DISABLE_PROMPT_CACHING === '1'
    const supportsCaching = !cachingGloballyDisabled && (
      this.config.model.includes('claude-3') ||
      this.config.model.includes('claude-sonnet') ||
      this.config.model.includes('claude-opus') ||
      this.config.model.includes('claude-haiku')
    )

    // System prompt with cache_control
    const systemWithCache = supportsCaching && options.systemPrompt
      ? [{ type: 'text' as const, text: options.systemPrompt, cache_control: { type: 'ephemeral' as const } }]
      : options.systemPrompt

    // Find the index of the LAST user message — that's where the marker goes
    const lastUserIdx = messages.reduce((last, msg, i) => msg.role === 'user' ? i : last, -1)

    const anthropicMessages = messages.map((msg, idx) => {
      const role = msg.role
      const rawContent = msg.content

      // Only add cache_control to the last user message's last content block
      if (supportsCaching && idx === lastUserIdx && role === 'user') {
        const content = typeof rawContent === 'string'
          ? [{ type: 'text' as const, text: rawContent, cache_control: { type: 'ephemeral' as const } }]
          : (rawContent as unknown as Array<Record<string, unknown>>).map((block, i, arr) =>
              i === arr.length - 1
                ? { ...block, cache_control: { type: 'ephemeral' as const } }
                : block
            )
        return { role, content }
      }
      return { role, content: rawContent }
    }) as Anthropic.MessageParam[]

    try {
      // Extended thinking support (Claude 3.5+ / 3 Opus)
      // Priority: explicit options.thinking > effort level from config > default (none)
      let thinkingConfig = (options as { thinking?: { type: string; budget_tokens: number } }).thinking
      const supportsThinking = this.config.model.includes('opus') || this.config.model.includes('sonnet-4')

      // If no explicit thinking config, check effort level from provider config
      if (!thinkingConfig && supportsThinking && modelSupportsEffort(this.config.model)) {
        const effortLevel = resolveEffortLevel(
          { effortLevel: this.config.effortLevel },
          this.config.model
        )
        if (effortLevel !== 'low') {
          const budget = getEffortThinkingBudget(effortLevel)
          if (budget > 0) {
            thinkingConfig = { type: 'enabled', budget_tokens: budget }
          }
        }
      }

      // Also cache the tools definition (rarely changes across turns)
      const toolsWithCache = supportsCaching && tools.length > 0
        ? tools.map((t, i) => i === tools.length - 1
            ? { ...t, cache_control: { type: 'ephemeral' } }
            : t
          ) as Anthropic.Tool[]
        : tools.length > 0 ? (tools as Anthropic.Tool[]) : undefined

      // CC's beta headers — port key Anthropic API betas
      const betas: string[] = []
      if (this.config.model.includes('claude')) {
        betas.push('claude-code-20250219')  // CC's main beta header
      }
      if (thinkingConfig && supportsThinking) {
        betas.push('interleaved-thinking-2025-05-14')  // CC's interleaved thinking beta
      }

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
        ...(betas.length > 0 ? { betas } : {}),
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
          // Note: thinking_delta events are NOT yielded to the UI (internal only)
          // Thinking blocks are preserved via finalMessage.content below

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

      // Yield thinking blocks from finalMessage.content for multi-turn preservation.
      // CC's thinking block rule: thinking/redacted_thinking blocks in an assistant
      // message MUST be preserved for the duration of an assistant trajectory.
      // Since we don't stream thinking deltas, we emit them here as a batch.
      const thinkingBlocks = finalMessage.content.filter(
        (b): b is { type: 'thinking'; thinking: string; signature: string } =>
          b.type === 'thinking'
      )
      for (const block of thinkingBlocks) {
        yield { type: 'thinking_block' as const, thinking: block.thinking, signature: block.signature }
      }

      yield { type: 'stop', stopReason: finalMessage.stop_reason ?? 'end_turn', usage }

    } catch (error) {
      // ── 529 / overloaded_error: throw FallbackTriggeredError so the query
      // loop can transparently switch to a lighter-weight fallback model.
      // CC pattern: provider throws, query catches, user sees a switch notice.
      const apiErr = error as { status?: number; error?: { type?: string } }
      if (apiErr.status === 529 || apiErr.error?.type === 'overloaded_error') {
        const fallback = resolveFallbackModel(this.config.model)
        if (fallback) {
          throw new FallbackTriggeredError(this.config.model, fallback)
        }
      }
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async getModels(): Promise<string[]> {
    try {
      // Anthropic API: GET /v1/models
      const response = await this.client.models.list()
      return response.data.map(m => m.id).sort()
    } catch {
      return []
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
