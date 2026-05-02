/**
 * GCP Vertex AI Provider
 *
 * 通过 GCP Vertex AI 访问 Claude 模型（Claude 3.x 和 4.x）
 *
 * 配置方式（任选其一）：
 *   1. Service Account JSON:
 *      GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *      ANTHROPIC_VERTEX_PROJECT_ID=your-project-id
 *      CLOUD_ML_REGION=us-east5  (default)
 *
 *   2. gcloud CLI (需先执行 gcloud auth application-default login):
 *      ANTHROPIC_VERTEX_PROJECT_ID=your-project-id
 *      CLOUD_ML_REGION=us-east5
 *
 *   3. 环境变量直接提供 access token:
 *      VERTEX_ACCESS_TOKEN=ya29.xxx
 *      ANTHROPIC_VERTEX_PROJECT_ID=your-project-id
 *
 * CC 对应实现: src/utils/model/providers.ts (CLAUDE_CODE_USE_VERTEX env var)
 */

import type { Provider, ProviderConfig, StreamOptions, StreamChunkType } from '../types/provider'
import type { Message, TokenUsage } from '../types/message'
import type { ToolDefinition } from '../types/tool'

// Vertex AI endpoint for Claude models
// Format: https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/{REGION}/publishers/anthropic/models/{MODEL}:streamRawPredict
const VERTEX_ENDPOINT_TEMPLATE =
  'https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/{REGION}/publishers/anthropic/models/{MODEL}:streamRawPredict'

// Vertex AI supports these Claude models
const VERTEX_MODEL_MAP: Record<string, string> = {
  'claude-opus-4-7':               'claude-opus-4@20250514',
  'claude-sonnet-4-6':             'claude-sonnet-4-5@20251120',
  'claude-haiku-4-5':              'claude-haiku-4-5@20251001',
  'claude-3-5-sonnet-20241022':    'claude-3-5-sonnet-v2@20241022',
  'claude-3-5-haiku-20241022':     'claude-3-5-haiku@20241022',
  'claude-3-opus-20240229':        'claude-3-opus@20240229',
  'claude-3-haiku-20240307':       'claude-3-haiku@20240307',
}

const VERTEX_CONTEXT_WINDOWS: Record<string, number> = {
  'claude-opus-4-7': 200_000,
  'claude-sonnet-4-6': 200_000,
  'claude-haiku-4-5': 200_000,
  'claude-3-5-sonnet-20241022': 200_000,
  'claude-3-5-haiku-20241022': 200_000,
}

async function getAccessToken(): Promise<string> {
  // 1. Direct env var (useful for CI/CD)
  if (process.env.VERTEX_ACCESS_TOKEN) {
    return process.env.VERTEX_ACCESS_TOKEN
  }

  // 2. Try Google Auth Library (installed separately: bun add google-auth-library)
  try {
    const { GoogleAuth } = await import('google-auth-library' as never) as {
      GoogleAuth: new (opts?: { scopes?: string[] }) => {
        getAccessToken(): Promise<{ token?: string | null }>
      }
    }
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })
    const tokenResult = await auth.getAccessToken()
    if (tokenResult.token) return tokenResult.token
  } catch { /* library not installed */ }

  // 3. Fallback: call gcloud CLI
  try {
    const proc = Bun.spawn(['gcloud', 'auth', 'application-default', 'print-access-token'], {
      stdout: 'pipe', stderr: 'pipe',
    })
    const token = (await new Response(proc.stdout).text()).trim()
    const code = await proc.exited
    if (code === 0 && token) return token
  } catch { /* gcloud not available */ }

  throw new Error(
    'Vertex AI: no access token found.\n' +
    'Options:\n' +
    '  1. Set VERTEX_ACCESS_TOKEN env var\n' +
    '  2. Run: gcloud auth application-default login\n' +
    '  3. Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON file'
  )
}

function buildEndpoint(model: string, project: string, region: string): string {
  const vertexModel = VERTEX_MODEL_MAP[model] ?? model
  return VERTEX_ENDPOINT_TEMPLATE
    .replace(/{REGION}/g, region)
    .replace('{PROJECT}', project)
    .replace('{MODEL}', vertexModel)
}

function convertMessages(messages: Message[]): unknown[] {
  return messages.map(m => ({
    role: m.role,
    content: typeof m.content === 'string'
      ? [{ type: 'text', text: m.content }]
      : m.content,
  }))
}

export class VertexProvider implements Provider {
  readonly config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
  }

  async *stream(
    messages: Message[],
    tools: ToolDefinition[],
    options: StreamOptions = {}
  ): AsyncGenerator<StreamChunkType> {
    const project = process.env.ANTHROPIC_VERTEX_PROJECT_ID
    if (!project) {
      throw new Error('Vertex AI requires ANTHROPIC_VERTEX_PROJECT_ID environment variable')
    }
    const region = process.env.CLOUD_ML_REGION ?? process.env.ANTHROPIC_VERTEX_REGION ?? 'us-east5'
    const model = this.config.model

    const accessToken = await getAccessToken()
    const endpoint = buildEndpoint(model, project, region)

    const body: Record<string, unknown> = {
      anthropic_version: 'vertex-2023-10-16',
      max_tokens: options.maxTokens ?? 8096,
      messages: convertMessages(messages),
      stream: true,
    }
    if (options.systemPrompt) body.system = options.systemPrompt
    if (tools.length > 0) body.tools = tools
    // Extended thinking via environment variable or provider config
    const thinkingBudget = Number(process.env.QILING_THINKING_BUDGET ?? 0)
    if (thinkingBudget > 0) {
      body.thinking = { type: 'enabled', budget_tokens: thinkingBudget }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Vertex AI error ${response.status}: ${text}`)
    }

    // Parse SSE stream
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let usage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }
    const toolInputs = new Map<string, string>()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
          const event = JSON.parse(data) as {
            type: string
            index?: number
            delta?: { type: string; text?: string; partial_json?: string }
            content_block?: { type: string; id?: string; name?: string }
            message?: { usage?: { input_tokens: number; output_tokens: number } }
            usage?: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number }
          }

          switch (event.type) {
            case 'content_block_start':
              if (event.content_block?.type === 'tool_use' && event.content_block.id) {
                yield { type: 'tool_use_start', id: event.content_block.id, name: event.content_block.name ?? '' }
                toolInputs.set(event.content_block.id, '')
              }
              break
            case 'content_block_delta':
              if (event.delta?.type === 'text_delta' && event.delta.text) {
                yield { type: 'text_delta', text: event.delta.text }
              }
              if (event.delta?.type === 'input_json_delta' && event.delta.partial_json !== undefined) {
                // Need to find the tool ID — use index if available
                const ids = [...toolInputs.keys()]
                const id = ids[event.index ?? ids.length - 1]
                if (id !== undefined) {
                  toolInputs.set(id, (toolInputs.get(id) ?? '') + event.delta.partial_json)
                  yield { type: 'tool_use_delta', id, inputDelta: event.delta.partial_json }
                }
              }
              break
            case 'content_block_stop': {
              const ids = [...toolInputs.keys()]
              const id = ids[event.index ?? ids.length - 1]
              if (id !== undefined && toolInputs.has(id)) {
                yield { type: 'tool_use_stop', id }
              }
              break
            }
            case 'message_delta':
              if (event.usage) {
                usage = {
                  inputTokens: usage.inputTokens,
                  outputTokens: event.usage.output_tokens ?? 0,
                  cacheReadTokens: event.usage.cache_read_input_tokens ?? usage.cacheReadTokens,
                  cacheWriteTokens: usage.cacheWriteTokens,
                }
              }
              break
            case 'message_start':
              if (event.message?.usage) {
                usage = {
                  inputTokens: event.message.usage.input_tokens,
                  outputTokens: event.message.usage.output_tokens,
                  cacheReadTokens: (event.message.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? 0,
                  cacheWriteTokens: 0,
                }
              }
              break
            case 'message_stop':
              yield { type: 'stop', stopReason: 'end_turn', usage }
              break
          }
        } catch { /* ignore parse errors */ }
      }
    }
  }

  countTokens(messages: Message[]): number {
    return messages.reduce((sum, m) => {
      const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
      return sum + Math.ceil(text.length / 4)
    }, 0)
  }

  getContextWindow(): number {
    return VERTEX_CONTEXT_WINDOWS[this.config.model] ?? 200_000
  }
}
