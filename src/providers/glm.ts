/**
 * 智谱 AI GLM Provider
 * API 文档: https://open.bigmodel.cn/dev/api
 * 兼容 OpenAI 格式
 */
import { OpenAICompatProvider } from './openai-compat'
import type { Provider, ProviderConfig } from '../types/provider'

const GLM_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4'

export const GLM_MODELS: Record<string, number> = {
  'glm-4-plus': 128_000,
  'glm-4': 128_000,
  'glm-4-flash': 128_000,       // 免费模型
  'glm-4-flashx': 128_000,      // 快速版
  'glm-4-long': 1_000_000,      // 超长上下文
  'glm-4-alltools': 128_000,    // 内置工具调用
  'glm-4-0520': 128_000,
  'codegeex-4': 128_000,        // 代码专用
}

export function createGlmProvider(config: ProviderConfig): Provider {
  const apiKey = config.apiKey ?? process.env.ZHIPUAI_API_KEY ?? process.env.GLM_API_KEY
  const model = config.model === 'claude-sonnet-4-6' ? 'glm-4-plus' : config.model

  return new OpenAICompatProvider({
    ...config,
    name: 'glm',
    displayName: '智谱 GLM',
    model,
    apiKey,
    endpoint: config.endpoint ?? GLM_ENDPOINT,
  })
}
