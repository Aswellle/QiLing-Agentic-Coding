import OpenAI from 'openai'
import type { Provider, ProviderConfig, StreamOptions, StreamChunkType } from '../types/provider'
import type { Message, TokenUsage } from '../types/message'
import type { ToolDefinition } from '../types/tool'

// Known context windows for common models
const CONTEXT_WINDOWS: Record<string, number> = {
  // MiniMax
  'MiniMax-Text-01': 1_000_000,
  'abab6.5s-chat': 245_760,
  'abab6.5-chat': 245_760,
  // OpenAI
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'gpt-4-turbo': 128_000,
  'gpt-3.5-turbo': 16_385,
  // Gemini via OpenAI-compat
  'gemini-2.0-flash': 1_000_000,
  'gemini-1.5-pro': 2_000_000,
}

export class OpenAICompatProvider implements Provider {
  readonly config: ProviderConfig
  private client: OpenAI

  constructor(config: ProviderConfig) {
    this.config = config
    this.client = new OpenAI({
      apiKey: config.apiKey ?? '',
      baseURL: config.endpoint,
    })
  }

  async *stream(
    messages: Message[],
    tools: ToolDefinition[],
    options: StreamOptions = {}
  ): AsyncGenerator<StreamChunkType> {
    // Convert our Message format to OpenAI format
    const openAIMessages: OpenAI.Chat.ChatCompletionMessageParam[] = []
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        openAIMessages.push({ role: msg.role as 'user' | 'assistant', content: msg.content })
        continue
      }

      const textBlocks = msg.content.filter(b => b.type === 'text')
      const toolUseBlocks = msg.content.filter(b => b.type === 'tool_use')
      const toolResultBlocks = msg.content.filter(b => b.type === 'tool_result')

      if (toolResultBlocks.length > 0) {
        for (const b of toolResultBlocks) {
          const tr = b as { tool_use_id: string; content: unknown }
          openAIMessages.push({
            role: 'tool',
            tool_call_id: tr.tool_use_id,
            content: typeof tr.content === 'string' ? tr.content : JSON.stringify(tr.content),
          })
        }
        continue
      }

      if (toolUseBlocks.length > 0 || textBlocks.length > 0) {
        const assistantMsg: OpenAI.Chat.ChatCompletionAssistantMessageParam = {
          role: 'assistant',
          content: textBlocks.map(b => (b as { text: string }).text).join('') || null,
        }
        if (toolUseBlocks.length > 0) {
          assistantMsg.tool_calls = toolUseBlocks.map(b => {
            const tu = b as { id: string; name: string; input: unknown }
            return {
              id: tu.id,
              type: 'function' as const,
              function: { name: tu.name, arguments: JSON.stringify(tu.input) },
            }
          })
        }
        openAIMessages.push(assistantMsg)
        continue
      }

      openAIMessages.push({ role: msg.role as 'user' | 'assistant', content: '' })
    }

    // Convert tool definitions to OpenAI function format
    const openAITools: OpenAI.Chat.ChatCompletionTool[] = tools.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }))

    try {
      const systemPrompt = options.systemPrompt
      const allMessages: OpenAI.Chat.ChatCompletionMessageParam[] = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...openAIMessages]
        : openAIMessages

      const stream = await this.client.chat.completions.create({
        model: this.config.model,
        messages: allMessages,
        tools: openAITools.length > 0 ? openAITools : undefined,
        max_tokens: options.maxTokens ?? this.config.maxTokens ?? 8096,
        temperature: options.temperature,
        stream: true,
        stream_options: { include_usage: true },
      })

      // Track tool calls being built across chunks
      const toolCallBuilders = new Map<number, { id: string; name: string; args: string }>()

      for await (const chunk of stream) {
        const choice = chunk.choices?.[0]
        if (!choice) continue

        const delta = choice.delta

        // Text delta
        if (delta.content) {
          yield { type: 'text_delta', text: delta.content }
        }

        // Tool call deltas
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index
            if (!toolCallBuilders.has(idx)) {
              const id = tc.id ?? `call_${idx}`
              const name = tc.function?.name ?? ''
              toolCallBuilders.set(idx, { id, name, args: '' })
              yield { type: 'tool_use_start', id, name }
            }
            const builder = toolCallBuilders.get(idx)!
            if (tc.id && !builder.id) builder.id = tc.id
            if (tc.function?.name && !builder.name) builder.name = tc.function.name
            if (tc.function?.arguments) {
              builder.args += tc.function.arguments
              yield { type: 'tool_use_delta', id: builder.id, inputDelta: tc.function.arguments }
            }
          }
        }

        // Finish
        if (choice.finish_reason) {
          for (const [, builder] of toolCallBuilders) {
            yield { type: 'tool_use_stop', id: builder.id }
          }
        }

        // Usage (in the final chunk when stream_options.include_usage is set)
        if (chunk.usage) {
          const usage: TokenUsage = {
            inputTokens: chunk.usage.prompt_tokens ?? 0,
            outputTokens: chunk.usage.completion_tokens ?? 0,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
          }
          yield {
            type: 'stop',
            stopReason: choice.finish_reason ?? 'stop',
            usage,
          }
        }
      }

      // If usage wasn't in stream, emit a stop with zeros
      if (!toolCallBuilders.size) {
        yield {
          type: 'stop',
          stopReason: 'stop',
          usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
        }
      }
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const baseUrl = this.config.endpoint ?? 'https://api.openai.com/v1'
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey ?? ''}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5_000),
      })
      if (!res.ok) return []
      const data = await res.json() as { data?: Array<{ id: string }> }
      return (data.data ?? []).map(m => m.id).sort()
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
    return CONTEXT_WINDOWS[this.config.model] ?? 128_000
  }
}
