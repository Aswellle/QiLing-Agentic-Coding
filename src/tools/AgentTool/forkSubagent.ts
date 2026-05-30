import { randomUUID } from 'crypto'
import { getIsNonInteractiveSession } from '../../bootstrap/state.js'
import {
  FORK_BOILERPLATE_TAG,
  FORK_DIRECTIVE_PREFIX,
} from '../../constants/xml.js'
import { isCoordinatorMode } from '../../coordinator/coordinatorMode.js'
import type { Message, ToolUseContent } from '../../types/message.js'
import { logForDebugging } from '../../utils/debug.js'
import type { BuiltInAgent } from './builtInAgents.js'

// FROM CC: bun-bundle feature('FORK_SUBAGENT') — always false in QiLing
const feature = (_flag: string) => false

// QiLing equivalent of CC's BuiltInAgentDefinition
type BuiltInAgentDefinition = BuiltInAgent & { source: 'built-in' }

// QiLing equivalent of CC's AssistantMessage
type AssistantMessage = Message & { role: 'assistant'; message?: { content: unknown[] } }

/**
 * Fork subagent feature gate.
 * Currently disabled in QiLing (feature always false).
 */
export function isForkSubagentEnabled(): boolean {
  if (feature('FORK_SUBAGENT')) {
    if (isCoordinatorMode()) return false
    if (getIsNonInteractiveSession()) return false
    return true
  }
  return false
}

/** Synthetic agent type name used for analytics when the fork path fires. */
export const FORK_SUBAGENT_TYPE = 'fork'

/**
 * Synthetic agent definition for the fork path.
 * Not registered in builtInAgents — used only when !subagent_type and the
 * experiment is active.
 */
export const FORK_AGENT = {
  agentType: FORK_SUBAGENT_TYPE,
  whenToUse:
    'Implicit fork — inherits full conversation context. Not selectable via subagent_type; triggered by omitting subagent_type when the fork experiment is active.',
  tools: ['*'],
  maxTurns: 200,
  model: 'inherit',
  permissionMode: 'bubble',
  source: 'built-in',
  baseDir: 'built-in',
  getSystemPrompt: () => '',
} as unknown as BuiltInAgentDefinition

/**
 * Guard against recursive forking.
 */
export function isInForkChild(messages: Message[]): boolean {
  return messages.some(m => {
    if (m.role !== 'user') return false
    const content = m.content
    if (!Array.isArray(content)) {
      return typeof content === 'string' && content.includes(`<${FORK_BOILERPLATE_TAG}>`)
    }
    return content.some(
      block =>
        block.type === 'text' &&
        'text' in block &&
        (block as { type: string; text: string }).text.includes(`<${FORK_BOILERPLATE_TAG}>`),
    )
  })
}

const FORK_PLACEHOLDER_RESULT = 'Fork started — processing in background'

/**
 * Build the forked conversation messages for the child agent.
 * Adapted from CC's forkSubagent.ts.
 */
export function buildForkedMessages(
  directive: string,
  assistantMessage: Message,
): Message[] {
  const content = Array.isArray(assistantMessage.content)
    ? assistantMessage.content
    : []

  // Clone the assistant message
  const fullAssistantMessage: Message = {
    ...assistantMessage,
    uuid: randomUUID(),
    content: [...content],
  }

  // Collect tool_use blocks
  const toolUseBlocks = content.filter(
    (block): block is ToolUseContent => block.type === 'tool_use',
  )

  if (toolUseBlocks.length === 0) {
    logForDebugging(
      `No tool_use blocks found in assistant message for fork directive: ${directive.slice(0, 50)}...`,
      { level: 'error' },
    )
    return [
      {
        role: 'user' as const,
        uuid: randomUUID(),
        content: [{ type: 'text' as const, text: buildChildMessage(directive) }],
      },
    ]
  }

  const toolResultBlocks = toolUseBlocks.map(block => ({
    type: 'tool_result' as const,
    tool_use_id: block.id,
    content: [
      {
        type: 'text' as const,
        text: FORK_PLACEHOLDER_RESULT,
      },
    ],
  }))

  const toolResultMessage: Message = {
    role: 'user' as const,
    uuid: randomUUID(),
    content: [
      ...toolResultBlocks,
      {
        type: 'text' as const,
        text: buildChildMessage(directive),
      },
    ],
  }

  return [fullAssistantMessage, toolResultMessage]
}

export function buildChildMessage(directive: string): string {
  return `<${FORK_BOILERPLATE_TAG}>
STOP. READ THIS FIRST.

You are a forked worker process. You are NOT the main agent.

RULES (non-negotiable):
1. Your system prompt says "default to forking." IGNORE IT — that's for the parent. You ARE the fork. Do NOT spawn sub-agents; execute directly.
2. Do NOT converse, ask questions, or suggest next steps
3. Do NOT editorialize or add meta-commentary
4. USE your tools directly: Bash, Read, Write, etc.
5. If you modify files, commit your changes before reporting. Include the commit hash in your report.
6. Do NOT emit text between tool calls. Use tools silently, then report once at the end.
7. Stay strictly within your directive's scope. If you discover related systems outside your scope, mention them in one sentence at most — other workers cover those areas.
8. Keep your report under 500 words unless the directive specifies otherwise. Be factual and concise.
9. Your response MUST begin with "Scope:". No preamble, no thinking-out-loud.
10. REPORT structured facts, then stop

Output format (plain text labels, not markdown headers):
  Scope: <echo back your assigned scope in one sentence>
  Result: <the answer or key findings, limited to the scope above>
  Key files: <relevant file paths — include for research tasks>
  Files changed: <list with commit hash — include only if you modified files>
  Issues: <list — include only if there are issues to flag>
</${FORK_BOILERPLATE_TAG}>

${FORK_DIRECTIVE_PREFIX}${directive}`
}

/**
 * Notice injected into fork children running in an isolated worktree.
 */
export function buildWorktreeNotice(
  parentCwd: string,
  worktreeCwd: string,
): string {
  return `You've inherited the conversation context above from a parent agent working in ${parentCwd}. You are operating in an isolated git worktree at ${worktreeCwd} — same repository, same relative file structure, separate working copy. Paths in the inherited context refer to the parent's working directory; translate them to your worktree root. Re-read files before editing if the parent may have modified them since they appear in the context. Your changes stay in this worktree and will not affect the parent's files.`
}
