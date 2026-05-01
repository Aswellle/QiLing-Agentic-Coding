import type { Settings } from '../settings/schema'

export interface ModelOption {
  provider: Settings['provider']
  model: string
  displayName: string
  contextWindow: string
  note?: string
}

export const MODEL_OPTIONS: ModelOption[] = [
  // 国产模型（首位展示）
  { provider: 'minimax', model: 'MiniMax-Text-01', displayName: 'MiniMax Text-01', contextWindow: '1M', note: '推荐' },
  { provider: 'minimax', model: 'abab6.5s-chat', displayName: 'MiniMax abab6.5s', contextWindow: '245K', note: '快速' },
  { provider: 'qwen', model: 'qwen-max', displayName: '通义千问 Max', contextWindow: '32K' },
  { provider: 'qwen', model: 'qwen-plus', displayName: '通义千问 Plus', contextWindow: '131K', note: '推荐' },
  { provider: 'qwen', model: 'qwen-turbo', displayName: '通义千问 Turbo', contextWindow: '131K', note: '快速' },
  { provider: 'qwen', model: 'qwen2.5-coder-32b-instruct', displayName: 'Qwen2.5 Coder 32B', contextWindow: '131K', note: '编程' },
  { provider: 'doubao', model: 'doubao-pro-128k', displayName: '豆包 Pro 128K', contextWindow: '128K' },
  { provider: 'doubao', model: 'doubao-1-5-pro-256k', displayName: '豆包 1.5 Pro 256K', contextWindow: '256K', note: '推荐' },
  { provider: 'glm', model: 'glm-4-plus', displayName: '智谱 GLM-4 Plus', contextWindow: '128K', note: '推荐' },
  { provider: 'glm', model: 'glm-4-flash', displayName: '智谱 GLM-4 Flash', contextWindow: '128K', note: '免费' },
  { provider: 'glm', model: 'codegeex-4', displayName: '智谱 CodeGeeX-4', contextWindow: '128K', note: '编程' },
  // Anthropic
  { provider: 'anthropic', model: 'claude-sonnet-4-6', displayName: 'Claude Sonnet 4.6', contextWindow: '200K', note: '推荐' },
  { provider: 'anthropic', model: 'claude-opus-4-7', displayName: 'Claude Opus 4.7', contextWindow: '200K' },
  { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', displayName: 'Claude Haiku 4.5', contextWindow: '200K', note: '快速' },
  // OpenAI
  { provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o', contextWindow: '128K' },
  { provider: 'openai', model: 'gpt-4o-mini', displayName: 'GPT-4o mini', contextWindow: '128K', note: '快速' },
  // 本地
  { provider: 'ollama', model: 'llama3.1', displayName: 'Ollama llama3.1', contextWindow: '128K', note: '本地' },
  { provider: 'ollama', model: 'qwen2.5-coder', displayName: 'Ollama Qwen2.5 Coder', contextWindow: '32K', note: '本地' },
  { provider: 'ollama', model: 'deepseek-r1', displayName: 'Ollama DeepSeek R1', contextWindow: '64K', note: '本地' },
]

export function formatModelList(current: { provider: string; model: string }): string {
  const lines = ['可用模型列表：\n']
  let currentProvider = ''

  for (const opt of MODEL_OPTIONS) {
    if (opt.provider !== currentProvider) {
      currentProvider = opt.provider
      lines.push(`  ${opt.provider.toUpperCase()}`)
    }
    const isCurrent = opt.provider === current.provider && opt.model === current.model
    const marker = isCurrent ? '▶' : ' '
    const note = opt.note ? `  [${opt.note}]` : ''
    lines.push(`  ${marker} ${opt.model.padEnd(28)} ${opt.contextWindow.padEnd(6)} ${note}`)
  }

  lines.push('\n使用: /model <model-name>  或  /model <provider>/<model-name>')
  return lines.join('\n')
}

export function resolveModel(arg: string): ModelOption | null {
  // Try exact model name match
  const byModel = MODEL_OPTIONS.find(o => o.model === arg)
  if (byModel) return byModel

  // Try "provider/model" format
  const [provider, ...modelParts] = arg.split('/')
  if (modelParts.length > 0) {
    const model = modelParts.join('/')
    const byFull = MODEL_OPTIONS.find(o => o.provider === provider && o.model === model)
    if (byFull) return byFull
  }

  // Fuzzy match by display name or partial model name
  const lower = arg.toLowerCase()
  return MODEL_OPTIONS.find(
    o => o.displayName.toLowerCase().includes(lower) || o.model.toLowerCase().includes(lower)
  ) ?? null
}
