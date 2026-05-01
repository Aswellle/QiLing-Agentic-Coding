import type { Provider, ProviderConfig } from '../types/provider'
import { AnthropicProvider } from './anthropic'
import { OpenAICompatProvider } from './openai-compat'
import type { Settings } from '../settings/schema'

// MiniMax API configuration
const MINIMAX_ENDPOINT = 'https://api.minimax.io/v1'
const MINIMAX_DEFAULT_MODEL = 'MiniMax-Text-01'

export function createProvider(settings: Settings): Provider {
  const config: ProviderConfig = {
    name: settings.provider,
    displayName: getDisplayName(settings.provider),
    model: settings.model,
    apiKey: settings.apiKey,
    endpoint: settings.endpoint,
    maxTokens: settings.maxTokens,
  }

  switch (settings.provider) {
    case 'anthropic':
      return new AnthropicProvider(config)

    case 'minimax':
      return new OpenAICompatProvider({
        ...config,
        endpoint: config.endpoint ?? MINIMAX_ENDPOINT,
        model: config.model === 'claude-sonnet-4-6' ? MINIMAX_DEFAULT_MODEL : config.model,
      })

    case 'openai':
      return new OpenAICompatProvider({
        ...config,
        apiKey: config.apiKey ?? process.env.OPENAI_API_KEY,
        endpoint: config.endpoint,
        model: config.model === 'claude-sonnet-4-6' ? 'gpt-4o' : config.model,
      })

    case 'gemini':
      return new OpenAICompatProvider({
        ...config,
        apiKey: config.apiKey ?? process.env.GEMINI_API_KEY,
        endpoint: config.endpoint ?? 'https://generativelanguage.googleapis.com/v1beta/openai',
        model: config.model === 'claude-sonnet-4-6' ? 'gemini-2.0-flash' : config.model,
      })

    default:
      return new AnthropicProvider(config)
  }
}

function getDisplayName(provider: string): string {
  const names: Record<string, string> = {
    anthropic: 'Anthropic Claude',
    openai: 'OpenAI GPT',
    gemini: 'Google Gemini',
    ollama: 'Ollama (Local)',
    minimax: 'MiniMax',
  }
  return names[provider] ?? provider
}

export { AnthropicProvider } from './anthropic'
export { OpenAICompatProvider } from './openai-compat'
export type { Provider, ProviderConfig } from '../types/provider'
