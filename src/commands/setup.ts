/**
 * /setup — 首次配置向导
 * 引导用户选择 provider、输入 API Key，测试连接，写入 ~/.qiling/settings.json
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

interface SetupStep {
  question: string
  options: Array<{ value: string; label: string; hint?: string }>
}

const PROVIDER_STEPS: SetupStep = {
  question: '请选择 AI Provider:',
  options: [
    { value: 'anthropic', label: 'Anthropic Claude',  hint: '需要 ANTHROPIC_API_KEY' },
    { value: 'qwen',      label: '阿里云通义千问',     hint: '需要 DASHSCOPE_API_KEY' },
    { value: 'doubao',    label: '字节跳动豆包',       hint: '需要 ARK_API_KEY' },
    { value: 'glm',       label: '智谱 GLM',          hint: '需要 ZHIPUAI_API_KEY' },
    { value: 'openai',    label: 'OpenAI',            hint: '需要 OPENAI_API_KEY' },
    { value: 'gemini',    label: 'Google Gemini',     hint: '需要 GEMINI_API_KEY' },
    { value: 'ollama',    label: 'Ollama (本地)',       hint: '无需 API Key，需本地运行 ollama' },
  ],
}

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-6',
  qwen:      'qwen-plus',
  doubao:    'doubao-1-5-pro-256k',
  glm:       'glm-4-plus',
  openai:    'gpt-4o',
  gemini:    'gemini-2.0-flash',
  ollama:    'llama3.1',
}

const ENV_VAR_MAP: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  qwen:      'DASHSCOPE_API_KEY',
  doubao:    'ARK_API_KEY',
  glm:       'ZHIPUAI_API_KEY',
  openai:    'OPENAI_API_KEY',
  gemini:    'GEMINI_API_KEY',
  ollama:    '',
}

async function testConnection(provider: string, apiKey: string): Promise<boolean> {
  if (provider === 'ollama') return true  // assume Ollama is available locally
  try {
    const { createProvider } = await import('../providers/index')
    const { loadSettings } = await import('../settings/loader')
    const settings = loadSettings(process.cwd(), { provider: provider as 'anthropic', apiKey })
    const prov = createProvider(settings)
    const stream = prov.stream(
      [{ role: 'user', content: 'Say "ok" and nothing else.' }],
      [],
      { maxTokens: 8 }
    )
    for await (const chunk of stream) {
      if (chunk.type === 'stop') return true
      if (chunk.type === 'error') return false
    }
    return true
  } catch {
    return false
  }
}

export const SETUP_PROMPT_TEXT = `## 首次配置向导

请按照以下步骤配置 QiLing：

1. 选择你想使用的 AI Provider
2. 提供对应的 API Key（或使用本地 Ollama）
3. 测试连接是否正常

运行 /setup 启动向导。`

/** 格式化 /setup 命令的引导文字 */
export function formatSetupGuide(): string {
  const lines = [
    '# 启灵 (QiLing) 首次配置',
    '',
    '请选择配置方式：',
    '',
    '## 方式一：环境变量（推荐，无需写配置文件）',
    '',
    '```bash',
    '# Anthropic Claude（推荐）',
    'export ANTHROPIC_API_KEY="your-api-key"',
    'qiling',
    '',
    '# 国产模型',
    'export DASHSCOPE_API_KEY="your-key"    # 通义千问',
    'export ARK_API_KEY="your-key"          # 豆包',
    'export ZHIPUAI_API_KEY="your-key"      # 智谱 GLM',
    '',
    '# 本地模型（无需 API Key）',
    'ollama serve  # 先启动 Ollama',
    'qiling --provider ollama --model llama3.1',
    '```',
    '',
    '## 方式二：运行 /setup 向导自动生成配置文件',
    '',
    '在 qiling 交互界面中输入 `/setup` 命令，向导将引导你完成配置。',
    '',
    '## 方式三：手动创建配置文件',
    '',
    '创建 `~/.qiling/settings.json`：',
    '```json',
    '{',
    '  "provider": "anthropic",',
    '  "model": "claude-sonnet-4-6",',
    '  "apiKey": "your-api-key"',
    '}',
    '```',
    '',
    '更多信息: https://github.com/Aswellle/QiLing-Agentic-Coding',
  ]
  return lines.join('\n')
}

export async function runSetupWizard(
  onMessage: (msg: string) => void,
  askQuestion: (q: string, options: Array<{ label: string; value: string; hint?: string }>) => Promise<string>
): Promise<void> {
  onMessage('# 启灵 (QiLing) 配置向导\n\n正在引导你完成首次配置...')

  // Step 1: Provider selection
  const provider = await askQuestion(
    PROVIDER_STEPS.question,
    PROVIDER_STEPS.options
  )

  const model = DEFAULT_MODELS[provider] ?? 'default'
  const envVar = ENV_VAR_MAP[provider] ?? ''
  const needsKey = provider !== 'ollama'

  let apiKey = ''
  if (needsKey) {
    // Check if key already exists in environment
    const existingKey = process.env[envVar]
    if (existingKey) {
      onMessage(`✓ 检测到已设置 ${envVar}，将使用现有 API Key`)
      apiKey = existingKey
    } else {
      onMessage(`\n请在下方输入你的 ${envVar}:\n（可从 ${getKeyUrl(provider)} 获取）`)
      // Prompt for key via command args — user types it as the next message
      onMessage(`⚠ 请使用以下命令直接配置（安全，Key 不会显示在历史记录中）：\n\n\`\`\`bash\nexport ${envVar}=your-api-key\nqiling --provider ${provider}\n\`\`\`\n\n或运行: /setup 之后按提示手动编辑配置文件。`)
      return
    }
  }

  // Step 2: Test connection
  onMessage(`正在测试与 ${provider} 的连接...`)
  const ok = await testConnection(provider, apiKey)

  if (!ok) {
    onMessage(`✗ 连接失败。请检查你的 API Key 是否正确。\n\n你仍然可以保存配置并在 API Key 有效后重新启动 QiLing。`)
  } else {
    onMessage(`✓ 连接成功！`)
  }

  // Step 3: Write config
  const configDir = join(homedir(), '.qiling')
  const configPath = join(configDir, 'settings.json')
  const config: Record<string, unknown> = { provider, model }
  if (apiKey) config.apiKey = apiKey

  mkdirSync(configDir, { recursive: true })
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')

  onMessage([
    `✓ 配置已保存到 ${configPath}`,
    '',
    `Provider: ${provider}`,
    `Model: ${model}`,
    apiKey ? `API Key: ${apiKey.slice(0, 8)}${'*'.repeat(Math.max(0, apiKey.length - 8))}` : '',
    '',
    '请重启 QiLing 使配置生效。',
  ].filter(Boolean).join('\n'))
}

function getKeyUrl(provider: string): string {
  const urls: Record<string, string> = {
    anthropic: 'https://console.anthropic.com/',
    qwen:      'https://dashscope.aliyuncs.com/',
    doubao:    'https://console.volcengine.com/ark',
    glm:       'https://open.bigmodel.cn/',
    openai:    'https://platform.openai.com/api-keys',
    gemini:    'https://aistudio.google.com/app/apikey',
  }
  return urls[provider] ?? '对应服务商控制台'
}
