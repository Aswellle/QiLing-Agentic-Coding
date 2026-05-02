import { z } from 'zod'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'

const CONFIG_DIR = '.qiling'
const SETTINGS_FILE = 'settings.json'
const GLOBAL_CONFIG_DIR = join(homedir(), '.qiling')

// Keys the AI must never touch (security policy)
const FORBIDDEN_KEYS = new Set(['apiKey', 'api_key', '_version'])

const inputSchema = z.object({
  action: z.enum(['get', 'set', 'list_keys'])
    .describe(
      'get = read current config value(s)\n' +
      'set = update a config key to a new value\n' +
      'list_keys = show all available top-level configuration keys'
    ),
  key: z.string().optional()
    .describe('Dot-notation config key, e.g. "model", "provider", "tools.webSearch.enabled", "permissions.allow"'),
  value: z.unknown().optional()
    .describe('New value for key (required for set). Use JSON types: string, number, boolean, array, object.'),
  scope: z.enum(['project', 'global']).default('project')
    .describe('"project" = .qiling/settings.json in current dir; "global" = ~/.qiling/settings.json'),
})

type Input = z.infer<typeof inputSchema>

function loadFile(path: string): Record<string, unknown> {
  try { return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown> }
  catch { return {} }
}

function saveFile(path: string, data: Record<string, unknown>): void {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

function getByDot(obj: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce((cur, part) => {
    if (cur && typeof cur === 'object') return (cur as Record<string, unknown>)[part]
    return undefined
  }, obj as unknown)
}

function setByDot(obj: Record<string, unknown>, key: string, value: unknown): void {
  const parts = key.split('.')
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!
    if (typeof cur[part] !== 'object' || cur[part] === null) cur[part] = {}
    cur = cur[part] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]!] = value
}

export const ConfigTool: Tool<Input> = {
  name: 'Config',

  description:
    'Read or update QiLing configuration (settings.json). ' +
    'Use action="list_keys" to discover available keys. ' +
    'Use action="get" with key="model" to read the current model. ' +
    'Use action="set" to change settings like model, provider, permissions rules, tool toggles. ' +
    'Scope "project" writes to .qiling/settings.json; "global" writes to ~/.qiling/settings.json. ' +
    'Note: apiKey cannot be read or written through this tool (use environment variables instead).',

  inputSchema,

  checkPermissions(input: Input): PermissionDecision {
    if (input.action === 'get' || input.action === 'list_keys') return { type: 'allow' }
    return {
      type: 'ask',
      description: `Update ${input.scope} config: ${input.key} = ${JSON.stringify(input.value)}`,
    }
  },

  async call(input: Input, ctx: ToolContext): Promise<ToolResult> {
    const projectPath = join(ctx.workingDir, CONFIG_DIR, SETTINGS_FILE)
    const globalPath = join(GLOBAL_CONFIG_DIR, SETTINGS_FILE)
    const targetPath = input.scope === 'global' ? globalPath : projectPath

    switch (input.action) {
      case 'list_keys': {
        const keys = [
          'provider         — AI provider (anthropic/openai/qwen/doubao/glm/ollama…)',
          'model            — Model name (e.g. claude-sonnet-4-6)',
          'maxTokens        — Max output tokens per response',
          'vimMode          — Enable vim keybindings (boolean)',
          'thinkingBudget   — Extended thinking token budget (0 = disabled)',
          'permissions.allow — Array of allow rule strings (e.g. ["Bash(git *)"])',
          'permissions.deny  — Array of deny rule strings',
          'tools.bash.enabled       — Enable/disable Bash tool',
          'tools.webSearch.enabled  — Enable/disable WebSearch tool',
          'tools.webSearch.apiKey   — Brave Search API key',
          'tools.webFetch.enabled   — Enable/disable WebFetch tool',
          'ui.theme         — Terminal theme (auto/dark/light)',
          'ui.language      — Interface language (zh-CN/en-US)',
          'hooks.PreToolUse — Pre-tool execution hooks',
          'hooks.PostToolUse — Post-tool execution hooks',
          'mcpServers       — MCP server configurations',
        ]
        return { content: [{ type: 'text', text: 'Available config keys:\n\n' + keys.join('\n') }] }
      }

      case 'get': {
        if (!input.key) {
          // Return entire config (minus forbidden keys)
          const data = loadFile(targetPath)
          const safe = { ...data }
          for (const k of FORBIDDEN_KEYS) delete safe[k]
          return { content: [{ type: 'text', text: JSON.stringify(safe, null, 2) }] }
        }
        // Block reading sensitive keys
        const topKey = input.key.split('.')[0]!
        if (FORBIDDEN_KEYS.has(topKey)) {
          return {
            content: [{ type: 'text', text: `Error: '${topKey}' cannot be read through ConfigTool. Use environment variables instead.` }],
            isError: true,
          }
        }
        const data = loadFile(targetPath)
        const value = getByDot(data, input.key)
        return {
          content: [{
            type: 'text',
            text: value === undefined
              ? `Key '${input.key}' not set in ${input.scope} config.`
              : `${input.key} = ${JSON.stringify(value, null, 2)}`,
          }],
        }
      }

      case 'set': {
        if (!input.key) {
          return { content: [{ type: 'text', text: 'Error: key is required for set' }], isError: true }
        }
        const topKey = input.key.split('.')[0]!
        if (FORBIDDEN_KEYS.has(topKey)) {
          return {
            content: [{ type: 'text', text: `Error: '${topKey}' cannot be set through ConfigTool. Use environment variables instead.` }],
            isError: true,
          }
        }
        const data = existsSync(targetPath) ? loadFile(targetPath) : {}
        setByDot(data, input.key, input.value)
        try {
          saveFile(targetPath, data)
        } catch (err) {
          return {
            content: [{ type: 'text', text: `Error writing config: ${err instanceof Error ? err.message : String(err)}` }],
            isError: true,
          }
        }
        return {
          content: [{
            type: 'text',
            text: `Updated ${input.scope} config: ${input.key} = ${JSON.stringify(input.value)}\nFile: ${targetPath}`,
          }],
        }
      }
    }
  },

  toDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object' as const,
        properties: {
          action: { type: 'string', enum: ['get', 'set', 'list_keys'] },
          key: { type: 'string', description: 'Dot-notation config key' },
          value: { description: 'New value (for set)' },
          scope: { type: 'string', enum: ['project', 'global'], default: 'project' },
        },
        required: ['action'],
      },
    }
  },
}
