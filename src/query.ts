import type { Message, TokenUsage, ToolUseContent, ToolResultContent, ContentBlock } from './types/message'
import type { Tool, ToolContext, PermissionManager } from './types/tool'
import type { Provider } from './types/provider'
import { withRetry } from './retry/withRetry'
import type { HooksConfig } from './hooks/index'

// Read-only tools that are safe to execute in parallel
const PARALLEL_SAFE_TOOLS = new Set([
  'FileRead', 'Glob', 'Grep', 'RepoMap', 'NotebookRead', 'WebFetch',
])

export interface QueryOptions {
  systemPrompt?: string
  maxTokens?: number
  maxRounds?: number
  signal?: AbortSignal
  hooks?: HooksConfig
  enableParallelTools?: boolean  // default: true for read-only tools
  thinkingBudget?: number        // >0 enables extended thinking for Claude
}

export interface QueryCallbacks {
  onTextDelta?: (text: string) => void
  onToolStart?: (id: string, name: string) => void
  onToolInputUpdate?: (id: string, partial: string) => void
  onToolComplete?: (id: string, name: string, result: string, isError: boolean) => void
  onPermissionRequest?: (
    toolName: string,
    description: string,
    resolve: (decision: 'allow' | 'deny', remember: 'session' | 'project' | 'global' | 'once') => void
  ) => void
  onUsageUpdate?: (usage: TokenUsage) => void
  onRetry?: (attempt: number, total: number, error: string, delayMs: number) => void
  onError?: (error: string) => void
}

export interface QueryResult {
  messages: Message[]
  usage: TokenUsage
  stopReason: string
  rounds: number
}

export async function runQuery(
  messages: Message[],
  tools: Map<string, Tool>,
  provider: Provider,
  permissions: PermissionManager,
  options: QueryOptions = {},
  callbacks: QueryCallbacks = {}
): Promise<QueryResult> {
  const workingMessages = [...messages]
  const maxRounds = options.maxRounds ?? 20
  const signal = options.signal
  const parallelEnabled = options.enableParallelTools !== false
  let totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }
  let finalStopReason = 'end_turn'
  let rounds = 0

  const toolDefinitions = Array.from(tools.values()).map(t => t.toDefinition())
  const context: ToolContext = {
    workingDir: process.cwd(),
    sessionId: `session-${Date.now()}`,
  }

  // Load hooks module once
  const { runHooks } = await import('./hooks/index')

  while (rounds < maxRounds) {
    rounds++
    if (signal?.aborted) { finalStopReason = 'aborted'; break }

    const pendingToolUses: ToolUseContent[] = []
    let currentAssistantText = ''
    const toolInputs = new Map<string, string>()
    let streamError: string | null = null
    let stopReasonThisRound = 'end_turn'

    // ── Stream with retry ────────────────────────────────────────────────
    try {
      await withRetry(async () => {
        pendingToolUses.length = 0
        currentAssistantText = ''
        toolInputs.clear()

        const streamOpts = {
          systemPrompt: options.systemPrompt,
          maxTokens: options.maxTokens,
          ...(options.thinkingBudget && options.thinkingBudget > 0 ? {
            thinking: { type: 'enabled' as const, budget_tokens: options.thinkingBudget },
          } : {}),
        }

        const stream = provider.stream(workingMessages, toolDefinitions, streamOpts)

        for await (const chunk of stream) {
          if (signal?.aborted) return

          switch (chunk.type) {
            case 'text_delta':
              currentAssistantText += chunk.text
              callbacks.onTextDelta?.(chunk.text)
              break

            case 'tool_use_start':
              toolInputs.set(chunk.id, '')
              callbacks.onToolStart?.(chunk.id, chunk.name)
              pendingToolUses.push({ type: 'tool_use', id: chunk.id, name: chunk.name, input: {} })
              break

            case 'tool_use_delta': {
              const prev = toolInputs.get(chunk.id) ?? ''
              toolInputs.set(chunk.id, prev + chunk.inputDelta)
              callbacks.onToolInputUpdate?.(chunk.id, chunk.inputDelta)
              break
            }

            case 'tool_use_stop': {
              const raw = toolInputs.get(chunk.id) ?? '{}'
              const tu = pendingToolUses.find(t => t.id === chunk.id)
              if (tu) {
                try { tu.input = JSON.parse(raw) as Record<string, unknown> }
                catch { tu.input = { _raw: raw } }
              }
              break
            }

            case 'stop':
              totalUsage = addUsage(totalUsage, chunk.usage)
              stopReasonThisRound = chunk.stopReason
              finalStopReason = chunk.stopReason
              callbacks.onUsageUpdate?.(totalUsage)
              break

            case 'error':
              throw new Error(chunk.error)
          }
        }
      }, {
        maxRetries: 3, baseDelay: 1_500, maxDelay: 300_000, signal,
        onRetry: callbacks.onRetry,
      })
    } catch (error) {
      if ((error instanceof DOMException && error.name === 'AbortError') ||
          (error instanceof Error && error.message === 'Aborted')) {
        finalStopReason = 'aborted'; break
      }
      streamError = error instanceof Error ? error.message : String(error)
      callbacks.onError?.(streamError)
      break
    }

    if (signal?.aborted) { finalStopReason = 'aborted' }

    // ── Build assistant message ─────────────────────────────────────────
    const assistantContent: ContentBlock[] = []
    if (currentAssistantText) assistantContent.push({ type: 'text', text: currentAssistantText })
    for (const tu of pendingToolUses) assistantContent.push(tu)

    if (assistantContent.length > 0) {
      workingMessages.push({
        role: 'assistant',
        content: assistantContent.length === 1 && assistantContent[0].type === 'text'
          ? currentAssistantText
          : assistantContent,
      })
    }

    // max_tokens: auto-continue
    if (stopReasonThisRound === 'max_tokens' && rounds <= 3) {
      workingMessages.push({ role: 'user', content: 'Please continue.' })
      continue
    }

    if (pendingToolUses.length === 0 || signal?.aborted || streamError) break

    // ── Permission phase (sequential — requires UI input) ────────────────
    const permittedToolUses: ToolUseContent[] = []
    const toolResults: ToolResultContent[] = []

    for (const toolUse of pendingToolUses) {
      if (signal?.aborted) break

      const tool = tools.get(toolUse.name)
      if (!tool) {
        const err = `Tool '${toolUse.name}' not found.`
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: err, is_error: true })
        callbacks.onToolComplete?.(toolUse.id, toolUse.name, err, true)
        continue
      }

      const perm = await permissions.check(toolUse.name, toolUse.input)

      if (perm.type === 'deny') {
        const err = `Permission denied: ${perm.reason}`
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: err, is_error: true })
        callbacks.onToolComplete?.(toolUse.id, toolUse.name, err, true)
        continue
      }

      if (perm.type === 'ask') {
        if (!callbacks.onPermissionRequest) {
          toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: 'Permission denied (no UI).', is_error: true })
          callbacks.onToolComplete?.(toolUse.id, toolUse.name, 'Denied.', true)
          continue
        }
        const dec = await new Promise<{ allow: boolean; remember: 'session' | 'project' | 'global' | 'once' }>(
          resolve => callbacks.onPermissionRequest!(toolUse.name, perm.description, (d, r) => resolve({ allow: d === 'allow', remember: r }))
        )
        if (!dec.allow) {
          toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: 'Permission denied by user.', is_error: true })
          callbacks.onToolComplete?.(toolUse.id, toolUse.name, 'Denied.', true)
          continue
        }
        if (dec.remember !== 'once') permissions.recordDecision(toolUse.name, '*', 'allow', dec.remember)
      }

      permittedToolUses.push(toolUse)
    }

    // ── Execution phase: parallel for read-only, serial for others ───────
    const executeOne = async (toolUse: ToolUseContent): Promise<ToolResultContent> => {
      const tool = tools.get(toolUse.name)!
      try {
        await runHooks('PreToolUse', options.hooks, {
          toolName: toolUse.name,
          input: toolUse.input as Record<string, unknown>,
          workingDir: context.workingDir,
          sessionId: context.sessionId,
        })

        const parsedInput = tool.inputSchema.parse(toolUse.input)
        const result = await tool.call(parsedInput, context)
        const text = result.content.map(c => c.text).join('\n')

        await runHooks('PostToolUse', options.hooks, {
          toolName: toolUse.name,
          input: toolUse.input as Record<string, unknown>,
          workingDir: context.workingDir,
          sessionId: context.sessionId,
          result: { content: text, isError: result.isError },
        })

        callbacks.onToolComplete?.(toolUse.id, toolUse.name, text, result.isError ?? false)
        return { type: 'tool_result', tool_use_id: toolUse.id, content: text, is_error: result.isError }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        callbacks.onToolComplete?.(toolUse.id, toolUse.name, msg, true)
        return { type: 'tool_result', tool_use_id: toolUse.id, content: `Tool error: ${msg}`, is_error: true }
      }
    }

    // Split into parallel-safe and serial groups
    const canParallel = parallelEnabled && permittedToolUses.length > 1
    const parallelGroup = canParallel
      ? permittedToolUses.filter(tu => PARALLEL_SAFE_TOOLS.has(tu.name))
      : []
    const serialGroup = canParallel
      ? permittedToolUses.filter(tu => !PARALLEL_SAFE_TOOLS.has(tu.name))
      : permittedToolUses

    // Run parallel group concurrently
    if (parallelGroup.length > 0) {
      const results = await Promise.all(parallelGroup.map(executeOne))
      toolResults.push(...results)
    }

    // Run serial group one at a time
    for (const toolUse of serialGroup) {
      if (signal?.aborted) break
      toolResults.push(await executeOne(toolUse))
    }

    if (toolResults.length > 0) {
      workingMessages.push({ role: 'user', content: toolResults })
    }
  }

  // Stop hook
  if (options.hooks?.Stop) {
    const { runHooks } = await import('./hooks/index')
    await runHooks('Stop', options.hooks, {
      toolName: '', input: {}, workingDir: context.workingDir, sessionId: context.sessionId,
    })
  }

  return { messages: workingMessages, usage: totalUsage, stopReason: finalStopReason, rounds }
}

function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  }
}
