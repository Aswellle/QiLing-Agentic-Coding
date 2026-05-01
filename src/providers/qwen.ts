/**
 * 阿里云通义千问 Provider
 * API 文档: https://help.aliyun.com/zh/dashscope/developer-reference/compatibility-of-openai-with-dashscope
 * 兼容 OpenAI 格式，通过 DashScope 端点
 */
import { OpenAICompatProvider } from './openai-compat'
import type { Provider, ProviderConfig } from '../types/provider'

const QWEN_ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1'

export const QWEN_MODELS: Record<string, number> = {
  'qwen-max': 32_768,
  'qwen-max-longcontext': 131_072,
  'qwen-plus': 131_072,
  'qwen-plus-latest': 131_072,
  'qwen-turbo': 131_072,
  'qwen-long': 10_000_000,  // 10M context
  'qwen2.5-72b-instruct': 131_072,
  'qwen2.5-32b-instruct': 131_072,
  'qwen2.5-14b-instruct': 131_072,
  'qwen2.5-7b-instruct': 131_072,
  'qwen2.5-coder-32b-instruct': 131_072,  // 编程专用
  'qwen2.5-coder-7b-instruct': 131_072,
}

export function createQwenProvider(config: ProviderConfig): Provider {
  const apiKey = config.apiKey ?? process.env.DASHSCOPE_API_KEY ?? process.env.QWEN_API_KEY
  const model = config.model === 'claude-sonnet-4-6' ? 'qwen-max' : config.model

  return new OpenAICompatProvider({
    ...config,
    name: 'qwen',
    displayName: '阿里云通义千问',
    model,
    apiKey,
    endpoint: config.endpoint ?? QWEN_ENDPOINT,
  })
}
