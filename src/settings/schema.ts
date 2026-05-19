import { z } from 'zod'

const permissionRuleSchema = z.string()

const permissionsSchema = z.object({
  allow: z.array(permissionRuleSchema).default([]),
  deny: z.array(permissionRuleSchema).default([]),
})

const toolConfigSchema = z.object({
  enabled: z.boolean().default(true),
})

const uiConfigSchema = z.object({
  theme: z.enum([
    'auto',
    'dark',
    'light',
    'dark-ansi',
    'light-ansi',
    'dark-daltonized',
    'light-daltonized',
  ]).default('auto'),
  language: z.enum(['zh-CN', 'en-US']).default('zh-CN'),
  streamingOutput: z.boolean().default(true),
  showTokenUsage: z.boolean().default(true),
})

const memoryConfigSchema = z.object({
  enabled: z.boolean().default(true),
  files: z.array(z.string()).default([
    '~/.qiling/QILING.md',
    '.qiling/QILING.md',
    'CLAUDE.md',
  ]),
})

export const settingsSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'gemini', 'ollama', 'minimax', 'qwen', 'doubao', 'glm', 'bedrock', 'vertex']).default('anthropic'),
  model: z.string().default('claude-sonnet-4-6'),
  apiKey: z.string().optional(),
  endpoint: z.string().optional(),
  maxTokens: z.number().int().positive().default(8096),

  permissions: permissionsSchema.default({}),

  tools: z.object({
    bash: toolConfigSchema.default({}),
    powershell: toolConfigSchema.default({}),
    webFetch: toolConfigSchema.default({}),
    webSearch: z.object({
      enabled: z.boolean().default(true),
      // Brave Search API key — https://api.search.brave.com
      // Also reads BRAVE_SEARCH_API_KEY env var. Leave empty for DuckDuckGo fallback.
      apiKey: z.string().optional(),
      maxResults: z.number().int().min(1).max(10).default(5),
    }).default({}),
    agent: toolConfigSchema.default({}),
  }).default({}),

  // Markdown rendering in TUI (disable for raw text output)
  markdownRendering: z.boolean().default(true),

  ui: uiConfigSchema.default({}),
  memory: memoryConfigSchema.default({}),

  // Hooks system — all CC hook event types supported
  // Hook types: command (shell), http (POST JSON), prompt (Haiku LLM condition)
  hooks: z.record(z.string(), z.array(z.object({
    matcher: z.string().optional(),
    hooks: z.array(z.union([
      z.object({ type: z.literal('command'), command: z.string(), timeout: z.number().optional() }),
      z.object({ type: z.literal('http'), url: z.string(), method: z.enum(['GET', 'POST', 'PUT']).optional(), headers: z.record(z.string()).optional(), timeout: z.number().optional() }),
      z.object({ type: z.literal('prompt'), prompt: z.string(), model: z.string().optional(), timeout: z.number().optional() }),
    ])),
  }))).optional(),

  // Vim keybindings in prompt input
  vimMode: z.boolean().default(false),

  // Thinking / extended reasoning
  thinkingBudget: z.number().int().min(0).default(0),  // 0 = disabled

  // MCP servers
  mcpServers: z.record(z.object({
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    url: z.string().optional(),
    env: z.record(z.string()).optional(),
  })).optional(),

  // Auto memory — enabled by default, can be disabled globally or per project
  autoMemoryEnabled: z.boolean().optional().default(true),

  // Effort level — controls extended thinking token budget
  effortLevel: z.enum(['low', 'medium', 'high', 'max']).optional(),

  // Output style — name of the active output style (from .qiling/output-styles/)
  outputStyle: z.string().optional(),

  // Fast mode — use a faster/cheaper model for quick queries
  fastMode: z.boolean().optional().default(false),

  // TLS CA certificate path — sets NODE_EXTRA_CA_CERTS for corporate TLS proxies
  // Equivalent to CC's settings.json "httpProxy.extraCACerts" field
  // Enterprise users behind TLS-intercepting firewalls (Zscaler, etc.) set this
  // to their CA bundle path to avoid SSL certificate errors
  extraCACerts: z.string().optional(),

  // Internal — used by /fast to restore the original model when toggling off
  _originalModel: z.string().optional(),

  // Default shell for ! commands and skill shell frontmatter
  // 'bash' (default) or 'powershell'. Does NOT auto-flip on Windows.
  defaultShell: z.enum(['bash', 'powershell']).optional().default('bash'),

  // Internal — not user-editable
  _version: z.number().default(1),
})

export type Settings = z.infer<typeof settingsSchema>
export type PermissionRule = z.infer<typeof permissionRuleSchema>
