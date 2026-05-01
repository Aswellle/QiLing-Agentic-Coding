import type { Provider, ProviderConfig } from '../types/provider'
import { AnthropicProvider } from './anthropic'
import type { Settings } from '../settings/schema'

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
    default:
      // Fall back to Anthropic for now; other providers added in P1
      return new AnthropicProvider(config)
  }
}

function getDisplayName(provider: string): string {
  const names: Record<string, string> = {
    anthropic: 'Anthropic Claude',
    openai: 'OpenAI GPT',
    gemini: 'Google Gemini',
    ollama: 'Ollama (Local)',
  }
  return names[provider] ?? provider
}

export { AnthropicProvider } from './anthropic'
export type { Provider, ProviderConfig } from '../types/provider'
