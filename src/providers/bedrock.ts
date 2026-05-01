/**
 * AWS Bedrock Provider
 * 使用 @anthropic-ai/bedrock-sdk 通过 AWS Bedrock 访问 Claude 模型
 *
 * 需要配置：
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_REGION (默认: us-east-1)
 *
 * 支持的模型（Bedrock ARN 格式）：
 *   anthropic.claude-sonnet-4-6
 *   anthropic.claude-3-5-sonnet-20241022-v2:0
 *   anthropic.claude-3-haiku-20240307-v1:0
 */
import type { Provider, ProviderConfig, StreamOptions, StreamChunkType } from '../types/provider'
import type { Message, TokenUsage } from '../types/message'
import type { ToolDefinition } from '../types/tool'

const BEDROCK_MODEL_MAP: Record<string, string> = {
  'claude-sonnet-4-6':              'anthropic.claude-sonnet-4-6',
  'claude-3-5-sonnet-20241022':     'anthropic.claude-3-5-sonnet-20241022-v2:0',
  'claude-3-haiku-20240307':        'anthropic.claude-3-haiku-20240307-v1:0',
  'claude-3-5-haiku-20241022':      'anthropic.claude-3-5-haiku-20241022-v1:0',
}

const BEDROCK_CONTEXT_WINDOWS: Record<string, number> = {
  'anthropic.claude-sonnet-4-6': 200_000,
  'anthropic.claude-3-5-sonnet-20241022-v2:0': 200_000,
  'anthropic.claude-3-haiku-20240307-v1:0': 200_000,
  'anthropic.claude-3-5-haiku-20241022-v1:0': 200_000,
}

export class BedrockProvider implements Provider {
  readonly config: ProviderConfig
  private client: unknown = null  // lazy init to avoid import cost

  constructor(config: ProviderConfig) {
    this.config = config
  }

  private async getClient() {
    if (this.client) return this.client
    try {
      // Dynamic import allows users to skip this dependency if not using Bedrock
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sdk = await import('@anthropic-ai/bedrock-sdk' as any) as { AnthropicBedrock: new (opts: Record<string, unknown>) => unknown }
      this.client = new sdk.AnthropicBedrock({
        awsRegion: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
        awsAccessKey: process.env.AWS_ACCESS_KEY_ID,
        awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
        awsSessionToken: process.env.AWS_SESSION_TOKEN,
      })
      return this.client
    } catch {
      throw new Error('AWS Bedrock requires @anthropic-ai/bedrock-sdk. Run: bun add @anthropic-ai/bedrock-sdk')
    }
  }

  async *stream(
    messages: Message[],
    tools: ToolDefinition[],
    options: StreamOptions = {}
  ): AsyncGenerator<StreamChunkType> {
    try {
      const client = await this.getClient() as {
        messages: {
          stream(params: unknown): {
            [Symbol.asyncIterator](): AsyncIterator<{
              type: string;
              index?: number;
              content_block?: { type: string; id?: string; name?: string };
              delta?: { type: string; text?: string; partial_json?: string };
              stop_reason?: string;
              usage?: { input_tokens: number; output_tokens: number };
            }>
            finalMessage(): Promise<{ stop_reason?: string; usage: { input_tokens: number; output_tokens: number } }>
          }
        }
      }

      // Map model name to Bedrock ARN
      const bedrockModel = BEDROCK_MODEL_MAP[this.config.model] ?? this.config.model

      const anthropicMessages = messages.map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : msg.content,
      }))

      const stream = client.messages.stream({
        model: bedrockModel,
        max_tokens: options.maxTokens ?? this.config.maxTokens ?? 8096,
        system: options.systemPrompt,
        messages: anthropicMessages,
        tools: tools.length > 0 ? tools : undefined,
      })

      const indexToId = new Map<number, string>()
      const toolInputs = new Map<string, string>()

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block?.type === 'tool_use' && event.content_block.id) {
            const { id, name } = event.content_block
            indexToId.set(event.index ?? 0, id)
            toolInputs.set(id, '')
            yield { type: 'tool_use_start', id, name: name! }
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta?.type === 'text_delta' && event.delta.text) {
            yield { type: 'text_delta', text: event.delta.text }
          } else if (event.delta?.type === 'input_json_delta' && event.delta.partial_json !== undefined) {
            const id = indexToId.get(event.index ?? 0)
            if (id) {
              toolInputs.set(id, (toolInputs.get(id) ?? '') + event.delta.partial_json)
              yield { type: 'tool_use_delta', id, inputDelta: event.delta.partial_json }
            }
          }
        } else if (event.type === 'content_block_stop') {
          const id = indexToId.get(event.index ?? 0)
          if (id && toolInputs.has(id)) yield { type: 'tool_use_stop', id }
        }
      }

      const final = await stream.finalMessage()
      const usage: TokenUsage = {
        inputTokens: final.usage.input_tokens,
        outputTokens: final.usage.output_tokens,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      }
      yield { type: 'stop', stopReason: final.stop_reason ?? 'end_turn', usage }
    } catch (error) {
      yield { type: 'error', error: error instanceof Error ? error.message : String(error) }
    }
  }

  countTokens(messages: Message[]): number {
    const text = messages.map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n')
    return Math.ceil(text.length / 4)
  }

  getContextWindow(): number {
    const bedrockModel = BEDROCK_MODEL_MAP[this.config.model] ?? this.config.model
    return BEDROCK_CONTEXT_WINDOWS[bedrockModel] ?? 200_000
  }
}
