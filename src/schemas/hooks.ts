/**
 * Hook Zod schemas extracted to break import cycles.
 * FROM CC: schemas/hooks.ts (adapt-new)
 * Adapted: HOOK_EVENTS from hooks/index.ts (not entrypoints/agentSdkTypes)
 */

import { HOOK_EVENTS, type HookEvent } from '../hooks/index.js'
import { z } from 'zod/v4'
import { lazySchema } from '../utils/lazySchema.js'
import { SHELL_TYPES } from '../utils/shell/shellProvider.js'

const IfConditionSchema = lazySchema(() =>
  z
    .string()
    .optional()
    .describe(
      'Permission rule syntax to filter when this hook runs (e.g., "Bash(git *)"). ' +
        'Only runs if the tool call matches the pattern. Avoids spawning hooks for non-matching commands.',
    ),
)

function buildHookSchemas() {
  const BashCommandHookSchema = z.object({
    type: z.literal('command').describe('Shell command hook type'),
    command: z.string().describe('Shell command to execute'),
    args: z.array(z.string()).optional(),
    if: IfConditionSchema(),
    shell: z.enum(SHELL_TYPES).optional().describe("Shell interpreter. 'bash' or 'powershell'. Defaults to bash."),
    timeout: z.number().positive().optional().describe('Timeout in seconds'),
    statusMessage: z.string().optional().describe('Custom status message'),
    once: z.boolean().optional().describe('If true, hook runs once and is removed'),
    async: z.boolean().optional().describe('If true, hook runs in background without blocking'),
    asyncRewake: z.boolean().optional().describe('If true, hook runs in background and wakes the model on exit code 2'),
    rewakeMessage: z.string().min(1).optional(),
    rewakeSummary: z.string().min(1).optional(),
  })

  const PromptHookSchema = z.object({
    type: z.literal('prompt').describe('LLM prompt hook type'),
    prompt: z.string().describe('Prompt to evaluate with LLM. Use $ARGUMENTS placeholder for hook input JSON.'),
    if: IfConditionSchema(),
    timeout: z.number().positive().optional(),
    model: z.string().optional(),
    continueOnBlock: z.boolean().optional(),
    statusMessage: z.string().optional(),
    once: z.boolean().optional(),
  })

  const HttpHookSchema = z.object({
    type: z.literal('http').describe('HTTP hook type'),
    url: z.string().url().describe('URL to POST the hook input JSON to'),
    if: IfConditionSchema(),
    timeout: z.number().positive().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    allowedEnvVars: z.array(z.string()).optional(),
    statusMessage: z.string().optional(),
    once: z.boolean().optional(),
  })

  const AgentHookSchema = z.object({
    type: z.literal('agent').describe('Agentic verifier hook type'),
    prompt: z.string().describe('Prompt describing what to verify. Use $ARGUMENTS placeholder for hook input JSON.'),
    if: IfConditionSchema(),
    timeout: z.number().positive().optional(),
    model: z.string().optional(),
    statusMessage: z.string().optional(),
    once: z.boolean().optional(),
  })

  const McpToolHookSchema = z.object({
    type: z.literal('mcp_tool').describe('MCP tool hook type'),
    server: z.string().describe('Name of an already-configured MCP server to invoke'),
    tool: z.string().describe('Name of the tool on that server to call'),
    input: z.record(z.string(), z.unknown()).optional(),
    if: IfConditionSchema(),
    timeout: z.number().positive().optional(),
    statusMessage: z.string().optional(),
    once: z.boolean().optional(),
  })

  return { BashCommandHookSchema, PromptHookSchema, HttpHookSchema, AgentHookSchema, McpToolHookSchema }
}

export const HookCommandSchema = lazySchema(() => {
  const { BashCommandHookSchema, PromptHookSchema, AgentHookSchema, HttpHookSchema, McpToolHookSchema } = buildHookSchemas()
  return z.discriminatedUnion('type', [
    BashCommandHookSchema,
    PromptHookSchema,
    AgentHookSchema,
    HttpHookSchema,
    McpToolHookSchema,
  ])
})

export const HookMatcherSchema = lazySchema(() =>
  z.object({
    matcher: z.string().optional().describe('String pattern to match (e.g. tool names like "Write")'),
    hooks: z.array(HookCommandSchema()).describe('List of hooks to execute when the matcher matches'),
  }),
)

export const HooksSchema = lazySchema(() =>
  z.partialRecord(z.enum(HOOK_EVENTS), z.array(HookMatcherSchema())),
)

export type HookCommand = z.infer<ReturnType<typeof HookCommandSchema>>
export type BashCommandHook = Extract<HookCommand, { type: 'command' }>
export type PromptHook = Extract<HookCommand, { type: 'prompt' }>
export type AgentHook = Extract<HookCommand, { type: 'agent' }>
export type HttpHook = Extract<HookCommand, { type: 'http' }>
export type HookMatcher = z.infer<ReturnType<typeof HookMatcherSchema>>
export type HooksSettings = Partial<Record<HookEvent, HookMatcher[]>>
