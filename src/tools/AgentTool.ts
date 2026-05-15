import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, ToolDefinition } from '../types/tool'
import { runQuery } from '../query'
import type { Provider } from '../types/provider'
import type { PermissionManager } from '../types/tool'
import { BUILT_IN_AGENTS, getBuiltInAgent } from './AgentTool/builtInAgents'

// Shared provider/permissions injected at startup
let _provider: Provider | null = null
let _permissions: PermissionManager | null = null
let _getTools: (() => Map<string, Tool>) | null = null
let _systemPrompt = ''

// ── Model shortcut resolution ─────────────────────────────────────────────────
const MODEL_SHORTCUTS: Record<string, string> = {
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-7',
  haiku: 'claude-haiku-4-5-20251001',
}

// ── Background agent registry ─────────────────────────────────────────────────
interface BackgroundAgent {
  promise: Promise<string>
  startedAt: number
  description: string
  status: 'running' | 'completed' | 'failed'
  result?: string
  name?: string
}

export const backgroundAgents = new Map<string, BackgroundAgent>()

export function configureAgentTool(
  provider: Provider,
  permissions: PermissionManager,
  getTools: () => Map<string, Tool>,
  systemPrompt: string
): void {
  _provider = provider
  _permissions = permissions
  _getTools = getTools
  _systemPrompt = systemPrompt
}

// Build dynamic subagent_type enum from built-in agents
const SUBAGENT_TYPES = BUILT_IN_AGENTS.map(a => a.agentType) as [string, ...string[]]

const inputSchema = z.object({
  prompt: z.string().describe('The task for the agent to perform. Be specific and include all context needed — the agent starts with no prior conversation history.'),
  description: z.string().optional().describe('Short description (3-5 words) of what the agent will do'),
  subagent_type: z.string().optional().describe(
    'Select a specialized built-in agent type. Available types:\n' +
    BUILT_IN_AGENTS.map(a => `- "${a.agentType}": ${a.whenToUse}`).join('\n') +
    '\nOmit to use the general-purpose agent.'
  ),
  system_prompt: z.string().optional().describe('Override the agent\'s system prompt (ignored when subagent_type is set)'),
  isolation: z.enum(['none', 'worktree']).default('none').describe(
    '"worktree": run in an isolated git worktree (safe for risky changes). ' +
    '"none": run in current working directory (default).'
  ),
  mode: z.enum(['acceptEdits', 'auto', 'bypassPermissions', 'default', 'dontAsk', 'plan']).optional()
    .describe('Permission mode override for this agent (default: inherits parent)'),
  cwd: z.string().optional()
    .describe('Absolute path to run the agent in. Overrides the working directory for all filesystem and shell operations within this agent. Mutually exclusive with isolation: "worktree".'),
  model: z.enum(['sonnet', 'opus', 'haiku']).optional().describe(
    'Optional model override for this agent. If omitted, uses the same model as the parent. ' +
    '"sonnet" = claude-sonnet-4-6, "opus" = claude-opus-4-7, "haiku" = claude-haiku-4-5-20251001'
  ),
  run_in_background: z.boolean().optional().describe(
    'Set to true to launch the agent in the background. Returns immediately with an agent ID. ' +
    'The agent runs asynchronously — use the agent ID to track its status.'
  ),
  name: z.string().optional().describe(
    'Optional name for this agent (used for coordinator mode inter-agent communication). ' +
    'Makes this agent addressable by name in the background agent registry.'
  ),
})

type Input = z.infer<typeof inputSchema>

// CC's DEFAULT_AGENT_PROMPT (verbatim from constants/prompts.ts)
const DEFAULT_AGENT_SYSTEM_PROMPT = `You are an agent for QiLing, an AI programming agent. Given the user's message, you should use the tools available to complete the task. Complete the task fully—don't gold-plate, but don't leave it half-done. When you complete the task, respond with a concise report covering what was done and any key findings — the caller will relay this to the user, so it only needs the essentials.

Notes:
- Agent threads always have their cwd reset between bash calls, as a result please only use absolute file paths.
- In your final response, share file paths (always absolute, never relative) that are relevant to the task. Include code snippets only when the exact text is load-bearing (e.g., a bug you found, a function signature the caller asked for) — do not recap code you merely read.
- For clear communication with the user the assistant MUST avoid using emojis.
- Do not use a colon before tool calls. Text like "Let me read the file:" followed by a read tool call should just be "Let me read the file." with a period.`

function buildAgentDescription(): string {
  const builtInLines = BUILT_IN_AGENTS.map(a =>
    `- "${a.agentType}": ${a.whenToUse}`
  ).join('\n')

  return (
    'Launch a new agent to handle complex, multi-step tasks. Each agent type has specific capabilities:\n' +
    builtInLines + '\n\n' +
    'When calling, specify a subagent_type parameter to select which agent type to use. ' +
    'If omitted, the general-purpose agent is used.\n\n' +
    'Always include a short description summarizing what the agent will do. ' +
    'The agent starts fresh with no conversation history — provide ALL necessary context in the prompt. ' +
    'NOT for: simple file reads, single glob/grep queries — use those tools directly instead.'
  )
}

export const AgentTool: Tool<Input> = {
  name: 'Agent',
  description: buildAgentDescription(),
  inputSchema,

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    if (!_provider || !_permissions || !_getTools) {
      return {
        content: [{ type: 'text', text: 'AgentTool not configured. This is an internal error.' }],
        isError: true,
      }
    }

    const agentMessages = [{ role: 'user' as const, content: input.prompt }]
    const agentTools = _getTools()
    const agentToolsNoSelf = new Map(agentTools)
    agentToolsNoSelf.delete('Agent') // Prevent infinite recursion

    // ── Built-in agent type dispatch ──────────────────────────────────────
    const builtIn = input.subagent_type ? getBuiltInAgent(input.subagent_type) : null
    if (builtIn) {
      for (const disallowed of builtIn.disallowedTools) {
        agentToolsNoSelf.delete(disallowed)
      }
    }

    const agentSystemPrompt = builtIn?.systemPrompt ?? input.system_prompt ?? DEFAULT_AGENT_SYSTEM_PROMPT
    const taskDesc = input.description ?? input.prompt.slice(0, 50)

    // ── Worktree isolation ────────────────────────────────────────────────
    let worktreeDir: string | null = null
    let worktreeBranch: string | null = null

    if (input.isolation === 'worktree') {
      try {
        const branchName = `agent/${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        const worktreePath = `${context.workingDir}/.qiling/worktrees/${branchName.replace('/', '-')}`

        const mkdirProc = Bun.spawn(['mkdir', '-p', worktreePath], { cwd: context.workingDir, stdout: 'pipe', stderr: 'pipe' })
        await mkdirProc.exited

        const wtProc = Bun.spawn(['git', 'worktree', 'add', '-b', branchName, worktreePath], {
          cwd: context.workingDir, stdout: 'pipe', stderr: 'pipe',
        })
        await wtProc.exited

        if (wtProc.exitCode === 0) {
          worktreeDir = worktreePath
          worktreeBranch = branchName
          context.onProgress?.(`Launching agent in worktree: ${branchName}`)
        } else {
          // Worktree setup failed — fall back to normal execution
          context.onProgress?.(`Worktree setup failed, running in-place`)
        }
      } catch {
        // Fallback silently
      }
    }

    // CC's cwd param: run agent in specific directory (mutually exclusive with worktree)
    const agentWorkingDir = worktreeDir ?? input.cwd ?? context.workingDir
    const agentContext: import('../types/tool').ToolContext = {
      workingDir: agentWorkingDir,
      sessionId: context.sessionId + '-agent',
    }

    context.onProgress?.(`Launching agent: ${taskDesc}`)

    // ── Model override resolution ─────────────────────────────────────────────
    const resolvedModel = input.model ? (MODEL_SHORTCUTS[input.model] ?? input.model) : undefined

    // ── Background agent launch ───────────────────────────────────────────────
    if (input.run_in_background) {
      const agentId = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

      const runAgentQuery = () => runQuery(
        agentMessages,
        agentToolsNoSelf,
        _provider!,
        _permissions!,
        { systemPrompt: agentSystemPrompt, maxRounds: 15, modelOverride: resolvedModel },
        {}
      ).then(result => {
        const assistantMessages = result.messages.filter(m => m.role === 'assistant')
        const lastMsg = assistantMessages[assistantMessages.length - 1]
        if (!lastMsg) return '(Agent produced no output)'
        return typeof lastMsg.content === 'string'
          ? lastMsg.content
          : (lastMsg.content as Array<{ type: string; text?: string }>)
              .filter(b => b.type === 'text')
              .map(b => b.text ?? '')
              .join('\n')
      })

      const promise = runAgentQuery()
        .then(result => {
          const entry = backgroundAgents.get(agentId)
          if (entry) { entry.status = 'completed'; entry.result = result }
          return result
        })
        .catch(err => {
          const entry = backgroundAgents.get(agentId)
          if (entry) { entry.status = 'failed'; entry.result = String(err) }
          throw err
        })

      backgroundAgents.set(agentId, {
        promise,
        startedAt: Date.now(),
        description: taskDesc,
        status: 'running',
        name: input.name,
      })

      return {
        content: [{
          type: 'text',
          text: `Agent launched in background.\nAgent ID: ${agentId}\nDescription: ${taskDesc}${input.name ? `\nName: ${input.name}` : ''}\n\nThe agent is working asynchronously.`,
        }],
      }
    }

    try {
      const result = await runQuery(
        agentMessages,
        agentToolsNoSelf,
        _provider,
        _permissions,
        { systemPrompt: agentSystemPrompt, maxRounds: 15, modelOverride: resolvedModel },
        {} // No callbacks for sub-agents
      )

      // ── Worktree cleanup ────────────────────────────────────────────────
      if (worktreeDir && worktreeBranch) {
        // Check if agent made any changes
        const diffProc = Bun.spawn(['git', 'diff', '--name-only', `HEAD..${worktreeBranch}`], {
          cwd: context.workingDir, stdout: 'pipe', stderr: 'pipe',
        })
        const changedFiles = (await new Response(diffProc.stdout).text()).trim()
        await diffProc.exited

        if (!changedFiles) {
          // No changes — clean up worktree silently
          await Bun.spawn(['git', 'worktree', 'remove', '--force', worktreeDir], { cwd: context.workingDir, stdout: 'pipe', stderr: 'pipe' }).exited
          await Bun.spawn(['git', 'branch', '-D', worktreeBranch], { cwd: context.workingDir, stdout: 'pipe', stderr: 'pipe' }).exited
        } else {
          // Changes exist — report them
          const extraInfo = `\n\n[Worktree: ${worktreeBranch} | Changed: ${changedFiles.split('\n').length} files]\nRun: git merge ${worktreeBranch}  to apply changes`
          const texts = result.messages.filter(m => m.role === 'assistant').slice(-1)
          if (texts.length > 0 && typeof texts[0].content === 'string') {
            texts[0].content += extraInfo
          }
        }
      }

      // Extract the final assistant message
      const assistantMessages = result.messages.filter(m => m.role === 'assistant')
      const lastMsg = assistantMessages[assistantMessages.length - 1]

      if (!lastMsg) {
        return { content: [{ type: 'text', text: '(Agent produced no output)' }] }
      }

      const text = typeof lastMsg.content === 'string'
        ? lastMsg.content
        : lastMsg.content
            .filter(b => b.type === 'text')
            .map(b => (b as { text: string }).text)
            .join('\n')

      const usageSummary = result.usage.inputTokens > 0
        ? `\n\n[Agent used ${result.usage.inputTokens + result.usage.outputTokens} tokens in ${result.rounds} rounds]`
        : ''

      return {
        content: [{ type: 'text', text: text + usageSummary }],
      }
    } catch (error) {
      // Clean up worktree on error
      if (worktreeDir && worktreeBranch) {
        Bun.spawn(['git', 'worktree', 'remove', '--force', worktreeDir], { cwd: context.workingDir }).exited.catch(() => {})
        Bun.spawn(['git', 'branch', '-D', worktreeBranch], { cwd: context.workingDir }).exited.catch(() => {})
      }
      return {
        content: [{ type: 'text', text: `Agent failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      }
    }
  },

  toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Complete task description with all necessary context' },
          description: { type: 'string', description: 'Short description (3-5 words) of what the agent will do' },
          subagent_type: {
            type: 'string',
            enum: SUBAGENT_TYPES,
            description: 'Built-in agent type specialization',
          },
          system_prompt: { type: 'string', description: 'Override agent system prompt (ignored when subagent_type is set)' },
          isolation: { type: 'string', enum: ['none', 'worktree'], default: 'none', description: 'Run in git worktree for safe isolation' },
          mode: { type: 'string', enum: ['acceptEdits', 'auto', 'bypassPermissions', 'default', 'dontAsk', 'plan'], description: 'Permission mode override' },
          cwd: { type: 'string', description: 'Absolute path to run agent in (mutually exclusive with isolation: worktree)' },
          model: { type: 'string', enum: ['sonnet', 'opus', 'haiku'], description: 'Optional model override. "sonnet" = claude-sonnet-4-6, "opus" = claude-opus-4-7, "haiku" = claude-haiku-4-5-20251001' },
          run_in_background: { type: 'boolean', description: 'Launch agent asynchronously and return immediately with an agent ID' },
          name: { type: 'string', description: 'Optional name for coordinator mode addressability' },
        },
        required: ['prompt'],
      },
    }
  },
}
