import type { Provider, ProviderConfig } from '../types/provider'
import { AnthropicProvider } from './anthropic'
import { OpenAICompatProvider } from './openai-compat'
import { createQwenProvider } from './qwen'
import { createDoubaoProvider } from './doubao'
import { createGlmProvider } from './glm'
import { createOllamaProvider } from './ollama'
import { BedrockProvider } from './bedrock'
import { VertexProvider } from './vertex'
import type { Settings } from '../settings/schema'

const MINIMAX_ENDPOINT = 'https://api.minimax.io/v1'
const MINIMAX_DEFAULT_MODEL = 'MiniMax-Text-01'

export function createProvider(settings: Settings): Provider {
  const apiKey = settings.apiKey
    ?? process.env.ANTHROPIC_API_KEY
    ?? process.env.MINIMAX_API_KEY
    ?? process.env.DASHSCOPE_API_KEY
    ?? process.env.QWEN_API_KEY
    ?? process.env.ARK_API_KEY
    ?? process.env.DOUBAO_API_KEY
    ?? process.env.ZHIPUAI_API_KEY
    ?? process.env.GLM_API_KEY
    ?? process.env.OPENAI_API_KEY
    ?? process.env.GEMINI_API_KEY

  const config: ProviderConfig = {
    name: settings.provider,
    displayName: getDisplayName(settings.provider),
    model: settings.model,
    apiKey,
    endpoint: settings.endpoint,
    maxTokens: settings.maxTokens,
  }

  switch (settings.provider) {
    case 'anthropic':
      return new AnthropicProvider({ ...config, apiKey: settings.apiKey ?? process.env.ANTHROPIC_API_KEY })

    case 'minimax':
      return new OpenAICompatProvider({
        ...config,
        apiKey: settings.apiKey ?? process.env.MINIMAX_API_KEY,
        endpoint: config.endpoint ?? MINIMAX_ENDPOINT,
        model: isDefaultModel(config.model) ? MINIMAX_DEFAULT_MODEL : config.model,
      })

    case 'openai':
      return new OpenAICompatProvider({
        ...config,
        apiKey: settings.apiKey ?? process.env.OPENAI_API_KEY,
        model: isDefaultModel(config.model) ? 'gpt-4o' : config.model,
      })

    case 'gemini':
      return new OpenAICompatProvider({
        ...config,
        apiKey: settings.apiKey ?? process.env.GEMINI_API_KEY,
        endpoint: config.endpoint ?? 'https://generativelanguage.googleapis.com/v1beta/openai',
        model: isDefaultModel(config.model) ? 'gemini-2.0-flash' : config.model,
      })

    case 'qwen':
      return createQwenProvider({
        ...config,
        apiKey: settings.apiKey ?? process.env.DASHSCOPE_API_KEY ?? process.env.QWEN_API_KEY,
      })

    case 'doubao':
      return createDoubaoProvider({
        ...config,
        apiKey: settings.apiKey ?? process.env.ARK_API_KEY ?? process.env.DOUBAO_API_KEY,
      })

    case 'glm':
      return createGlmProvider({
        ...config,
        apiKey: settings.apiKey ?? process.env.ZHIPUAI_API_KEY ?? process.env.GLM_API_KEY,
      })

    case 'ollama':
      return createOllamaProvider({
        ...config,
        apiKey: 'ollama',
        model: isDefaultModel(config.model) ? 'llama3.1' : config.model,
      })

    case 'bedrock':
      return new BedrockProvider({
        ...config,
        displayName: 'AWS Bedrock',
        model: isDefaultModel(config.model) ? 'claude-sonnet-4-6' : config.model,
      })

    case 'vertex':
      return new VertexProvider({
        ...config,
        displayName: 'Google Cloud Vertex AI',
        model: isDefaultModel(config.model) ? 'claude-sonnet-4-6' : config.model,
      })

    default:
      return new AnthropicProvider(config)
  }
}

function isDefaultModel(model: string): boolean {
  return model === 'claude-sonnet-4-6' || !model
}

function getDisplayName(provider: string): string {
  const names: Record<string, string> = {
    anthropic: 'Anthropic Claude',
    openai: 'OpenAI GPT',
    gemini: 'Google Gemini',
    ollama: 'Ollama (Local)',
    minimax: 'MiniMax',
    qwen: '阿里云通义千问',
    doubao: '字节跳动豆包',
    glm: '智谱 GLM',
    bedrock: 'AWS Bedrock',
    vertex: 'Google Cloud Vertex',
  }
  return names[provider] ?? provider
}

export { AnthropicProvider } from './anthropic'
export { OpenAICompatProvider } from './openai-compat'
export type { Provider, ProviderConfig } from '../types/provider'
