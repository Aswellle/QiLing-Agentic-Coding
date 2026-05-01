/**
 * 字节跳动 Doubao (豆包) Provider
 * API 文档: https://www.volcengine.com/docs/82379/1263279
 * 兼容 OpenAI 格式
 */
import { OpenAICompatProvider } from './openai-compat'
import type { Provider, ProviderConfig } from '../types/provider'

const DOUBAO_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3'

export const DOUBAO_MODELS: Record<string, number> = {
  'doubao-pro-32k': 32_768,
  'doubao-pro-128k': 131_072,
  'doubao-pro-256k': 262_144,
  'doubao-lite-32k': 32_768,
  'doubao-lite-128k': 131_072,
  'doubao-character-pro-32k': 32_768,  // 角色扮演
  'doubao-1-5-pro-256k': 262_144,      // 最新版
  'doubao-1-5-pro-32k': 32_768,
}

export function createDoubaoProvider(config: ProviderConfig): Provider {
  const apiKey = config.apiKey ?? process.env.ARK_API_KEY ?? process.env.DOUBAO_API_KEY
  const model = config.model === 'claude-sonnet-4-6' ? 'doubao-pro-128k' : config.model

  return new OpenAICompatProvider({
    ...config,
    name: 'doubao',
    displayName: '字节跳动豆包',
    model,
    apiKey,
    endpoint: config.endpoint ?? DOUBAO_ENDPOINT,
  })
}
