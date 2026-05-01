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
  theme: z.enum(['auto', 'dark', 'light']).default('auto'),
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
  provider: z.enum(['anthropic', 'openai', 'gemini', 'ollama', 'minimax', 'qwen', 'doubao', 'glm']).default('anthropic'),
  model: z.string().default('claude-sonnet-4-6'),
  apiKey: z.string().optional(),
  endpoint: z.string().optional(),
  maxTokens: z.number().int().positive().default(8096),

  permissions: permissionsSchema.default({}),

  tools: z.object({
    bash: toolConfigSchema.default({}),
    powershell: toolConfigSchema.default({}),
    webFetch: toolConfigSchema.default({}),
    agent: toolConfigSchema.default({}),
  }).default({}),

  ui: uiConfigSchema.default({}),
  memory: memoryConfigSchema.default({}),

  // MCP servers
  mcpServers: z.record(z.object({
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    url: z.string().optional(),
    env: z.record(z.string()).optional(),
  })).optional(),

  // Internal — not user-editable
  _version: z.number().default(1),
})

export type Settings = z.infer<typeof settingsSchema>
export type PermissionRule = z.infer<typeof permissionRuleSchema>
