/**
 * Ollama 本地模型 Provider
 * API 文档: https://github.com/ollama/ollama/blob/main/docs/openai.md
 * 兼容 OpenAI /v1/chat/completions 格式
 */
import { OpenAICompatProvider } from './openai-compat'
import type { Provider, ProviderConfig } from '../types/provider'

const OLLAMA_DEFAULT_ENDPOINT = 'http://localhost:11434/v1'

// Common Ollama models and their approximate context windows
const OLLAMA_CONTEXT_WINDOWS: Record<string, number> = {
  'llama3.3': 131_072,
  'llama3.3:70b': 131_072,
  'llama3.1': 131_072,
  'llama3.1:70b': 131_072,
  'llama3.1:405b': 131_072,
  'qwen2.5-coder': 32_768,
  'qwen2.5-coder:32b': 131_072,
  'qwen2.5': 131_072,
  'deepseek-r1': 65_536,
  'deepseek-r1:32b': 65_536,
  'deepseek-coder-v2': 65_536,
  'codellama': 16_384,
  'mistral': 32_768,
  'phi4': 16_384,
}

export function createOllamaProvider(config: ProviderConfig): Provider {
  const endpoint = config.endpoint ?? process.env.OLLAMA_HOST ?? OLLAMA_DEFAULT_ENDPOINT

  // Ensure the endpoint ends with /v1
  const normalizedEndpoint = endpoint.endsWith('/v1')
    ? endpoint
    : endpoint.replace(/\/$/, '') + '/v1'

  // Ollama doesn't need an API key, but OpenAI SDK requires one
  const apiKey = config.apiKey ?? 'ollama'

  const contextWindow = OLLAMA_CONTEXT_WINDOWS[config.model] ?? 32_768

  const provider = new OpenAICompatProvider({
    ...config,
    name: 'ollama',
    displayName: `Ollama (${config.model})`,
    apiKey,
    endpoint: normalizedEndpoint,
  })

  // Override context window from our lookup table
  provider.getContextWindow = () => contextWindow

  // Wire up model discovery
  const baseEndpoint = normalizedEndpoint
  provider.getModels = async () => listOllamaModels(baseEndpoint)

  return provider
}

/** Check if Ollama is running locally */
export async function isOllamaAvailable(endpoint = OLLAMA_DEFAULT_ENDPOINT): Promise<boolean> {
  try {
    const response = await fetch(`${endpoint.replace('/v1', '')}/api/tags`, {
      signal: AbortSignal.timeout(2_000),
    })
    return response.ok
  } catch {
    return false
  }
}

/** List available Ollama models */
export async function listOllamaModels(endpoint = OLLAMA_DEFAULT_ENDPOINT): Promise<string[]> {
  try {
    const response = await fetch(`${endpoint.replace('/v1', '')}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) return []
    const data = await response.json() as { models: Array<{ name: string }> }
    return data.models.map(m => m.name)
  } catch {
    return []
  }
}
