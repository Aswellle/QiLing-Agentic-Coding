import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, ToolDefinition } from '../types/tool'
import { runQuery } from '../query'
import type { Provider } from '../types/provider'
import type { PermissionManager } from '../types/tool'

// Shared provider/permissions injected at startup
let _provider: Provider | null = null
let _permissions: PermissionManager | null = null
let _getTools: (() => Map<string, Tool>) | null = null
let _systemPrompt = ''

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

const inputSchema = z.object({
  prompt: z.string().describe('The task for the agent to perform. Be specific and include all context needed — the agent starts with no prior conversation history.'),
  description: z.string().optional().describe('Short description (3-5 words) of what the agent will do'),
  system_prompt: z.string().optional().describe('Override the agent\'s system prompt'),
})

type Input = z.infer<typeof inputSchema>

const AGENT_SYSTEM_PROMPT = `You are a specialized sub-agent of QiLing. You are given a specific task to complete autonomously.
Complete the task efficiently and report back. Be concise in your response — include only the results, not the reasoning process.
You have access to all standard tools (FileRead, FileEdit, FileWrite, Glob, Grep, Bash/PowerShell, WebFetch).`

export const AgentTool: Tool<Input> = {
  name: 'Agent',
  description:
    'Launch a sub-agent to handle a complex, multi-step task autonomously. ' +
    'The agent starts fresh with no conversation history — provide ALL necessary context in the prompt. ' +
    'Use for: tasks that require many tool calls, parallel research, or operations that would clutter the main context. ' +
    'NOT for: simple file reads, single glob/grep queries — use those tools directly instead.',
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
    // Remove Agent from agent's toolset to prevent infinite recursion
    const agentToolsNoSelf = new Map(agentTools)
    agentToolsNoSelf.delete('Agent')

    const agentSystemPrompt = input.system_prompt ?? AGENT_SYSTEM_PROMPT
    const taskDesc = input.description ?? input.prompt.slice(0, 50)

    context.onProgress?.(`Launching agent: ${taskDesc}`)

    try {
      const result = await runQuery(
        agentMessages,
        agentToolsNoSelf,
        _provider,
        _permissions,
        { systemPrompt: agentSystemPrompt, maxRounds: 15 },
        {} // No callbacks for sub-agents (output goes to result)
      )

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
          system_prompt: { type: 'string', description: 'Override agent system prompt' },
        },
        required: ['prompt'],
      },
    }
  },
}
