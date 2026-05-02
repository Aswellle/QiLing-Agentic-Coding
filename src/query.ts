/**
 * QiLing query engine — core agentic loop.
 *
 * CC alignment:
 *   ✓ StreamingToolExecutor (tools start during AI streaming)
 *   ✓ max_tokens two-phase recovery (escalate → multi-turn)
 *   ✓ reactiveCompact (auto-recover from prompt-too-long)
 *   ✓ autoCompact (threshold-triggered context compression)
 *   ✓ microcompact (per-round tool_result truncation)
 *   ✓ toolUseSummary (Haiku background summaries after tool rounds)
 *   ✓ tokenBudget (nudge model before context exhaustion)
 *   ✓ AskUserQuestion / EnterPlanMode / ExitPlanMode interaction hooks
 */

import type { Message, TokenUsage, ToolUseContent, ToolResultContent, ContentBlock } from './types/message'
import type { Tool, ToolContext, PermissionManager } from './types/tool'
import type { Provider } from './types/provider'
import { withRetry } from './retry/withRetry'
import type { HooksConfig } from './hooks/index'
import { ASK_USER_QUESTION_TOOL_NAME } from './tools/AskUserQuestionTool'
import type { AskUserQuestion } from './tools/AskUserQuestionTool'
import { ENTER_PLAN_MODE_TOOL_NAME } from './tools/EnterPlanModeTool'
import { EXIT_PLAN_MODE_TOOL_NAME } from './tools/ExitPlanModeTool'
import { getActiveWorktreeSession } from './services/worktree/store'
import { StreamingToolExecutor } from './query/StreamingToolExecutor'
import { microcompact } from './compact/engine'
import { compactConversation } from './compact/engine'
import { shouldAutoCompact } from './compact/autoCompact'
import { isPromptTooLong, isMediaSizeError, tryReactiveCompact } from './compact/reactiveCompact'
import { createBudgetTracker, checkTokenBudget } from './compact/tokenBudget'
import { generateToolUseSummary, extractToolInfoFromResults } from './services/toolUseSummary/generator'
import { applyCollapsesIfNeeded } from './services/contextCollapse/index'

// ─── Tools safe to run concurrently during AI streaming ──────────────────────
// These always have permission=allow and no destructive side effects.
const STREAMING_SAFE_TOOLS = new Set([
  'FileRead', 'Glob', 'Grep', 'RepoMap', 'NotebookRead',
  'WebFetch', 'WebSearch',
  'TaskList', 'TaskGet', 'TaskOutput',
  'CronList', 'ListMcpResources', 'ToolSearch',
  'TodoRead',
])

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface QueryOptions {
  systemPrompt?: string
  maxTokens?: number
  maxRounds?: number
  signal?: AbortSignal
  hooks?: HooksConfig
  /** Enable StreamingToolExecutor (default: true) */
  enableStreamingTools?: boolean
  /** Token budget for the whole turn (cross-compact tracking) */
  taskBudgetTokens?: number
  thinkingBudget?: number
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
  onAskUserQuestion?: (
    questions: AskUserQuestion[],
    resolve: (answers: Record<string, string>) => void
  ) => void
  onEnterPlanMode?: () => void
  onExitPlanMode?: (plan: string, resolve: (approved: boolean) => void) => void
  onUsageUpdate?: (usage: TokenUsage) => void
  onRetry?: (attempt: number, total: number, error: string, delayMs: number) => void
  onError?: (error: string) => void
  /** Called when context compression is triggered */
  onCompact?: (reason: 'threshold' | 'reactive' | 'manual', msg: string) => void
}

export interface QueryResult {
  messages: Message[]
  usage: TokenUsage
  stopReason: string
  rounds: number
}

// ─── runQuery ─────────────────────────────────────────────────────────────────

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
  const streamingEnabled = options.enableStreamingTools !== false
  const modelName = provider.config.model

  let totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }
  let finalStopReason = 'end_turn'
  let rounds = 0

  // max_tokens recovery state (CC Phase 1 + Phase 2)
  let maxTokensRecoveryCount = 0
  const MAX_TOKENS_RECOVERY_LIMIT = 3
  let effectiveMaxTokens = options.maxTokens

  // reactiveCompact: prevent spiral — only attempt once per runQuery call
  let hasAttemptedReactiveCompact = false

  // autoCompact: circuit breaker
  let autoCompactFailures = 0

  // tokenBudget: optional cross-round tracking
  const budgetTracker = options.taskBudgetTokens ? createBudgetTracker() : null

  const toolDefinitions = Array.from(tools.values()).map(t => t.toDefinition())
  const activeWorktree = getActiveWorktreeSession()
  const context: ToolContext = {
    workingDir: activeWorktree?.worktreePath ?? process.cwd(),
    sessionId: `session-${Date.now()}`,
  }

  const { runHooks } = await import('./hooks/index')

  // ─── Core tool runner (used by StreamingToolExecutor) ──────────────────────
  const makeCoreRunner = (toolUse: ToolUseContent) =>
    async (id: string, name: string, input: unknown) => {
      const tool = tools.get(name)
      if (!tool) {
        const err = `Tool '${name}' not found.`
        callbacks.onToolComplete?.(id, name, err, true)
        return { type: 'tool_result' as const, tool_use_id: id, content: err, is_error: true }
      }
      try {
        await runHooks('PreToolUse', options.hooks, {
          toolName: name, input: input as Record<string, unknown>,
          workingDir: context.workingDir, sessionId: context.sessionId,
        })
        const parsedInput = tool.inputSchema.parse(input)
        const result = await tool.call(parsedInput, context)
        const text = result.content.map(c => c.text).join('\n')
        await runHooks('PostToolUse', options.hooks, {
          toolName: name, input: input as Record<string, unknown>,
          workingDir: context.workingDir, sessionId: context.sessionId,
          result: { content: text, isError: result.isError },
        })
        callbacks.onToolComplete?.(id, name, text, result.isError ?? false)
        return { type: 'tool_result' as const, tool_use_id: id, content: text, is_error: result.isError }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        callbacks.onToolComplete?.(id, name, msg, true)
        return { type: 'tool_result' as const, tool_use_id: id, content: `Tool error: ${msg}`, is_error: true }
      }
    }

  // ─────────────────────────────────────────────────────────────────────────
  while (rounds < maxRounds) {
    if (signal?.aborted) { finalStopReason = 'aborted'; break }

    // ── 1. AutoCompact: threshold check before each iteration ─────────────
    //    Mirrors CC: fires when token usage >= (context_window - 13k buffer)
    if (
      rounds > 0 &&
      shouldAutoCompact(totalUsage, modelName, autoCompactFailures)
    ) {
      const reason = '自动压缩：上下文接近上限'
      callbacks.onCompact?.('threshold', reason)
      try {
        const compacted = await compactConversation(workingMessages, provider, permissions, {
          signal,
          onProgress: msg => callbacks.onCompact?.('threshold', msg),
        })
        workingMessages.length = 0
        workingMessages.push(...compacted.messages)
        autoCompactFailures = 0
      } catch {
        autoCompactFailures++
        // Continue anyway — better to try than to crash
      }
    }

    // ── 2a. ContextCollapse: fold old tool rounds into summary text ────────
    //    Cheaper than autoCompact (no AI calls) — collapses rounds beyond
    //    KEEP_FULL_ROUNDS threshold. Mirrors CC's contextCollapse service.
    if (rounds > 1) {
      const collapsed = applyCollapsesIfNeeded(workingMessages)
      if (collapsed !== workingMessages) {
        workingMessages.length = 0
        workingMessages.push(...collapsed)
      }
    }

    // ── 2b. Microcompact: truncate verbose old tool_results ────────────────
    //    Runs after collapse (complementary — collapse removes structure,
    //    microcompact truncates remaining verbose content).
    if (rounds > 0) {
      const compacted = microcompact(workingMessages)
      workingMessages.length = 0
      workingMessages.push(...compacted)
    }

    rounds++

    // ── Per-round state ────────────────────────────────────────────────────
    const pendingToolUses: ToolUseContent[] = []
    const streamingStarted = new Set<string>()
    let currentAssistantText = ''
    const toolInputs = new Map<string, string>()
    let streamError: string | null = null
    let stopReasonThisRound = 'end_turn'
    let executor = new StreamingToolExecutor(STREAMING_SAFE_TOOLS, signal)

    // ── 3. Stream with retry ───────────────────────────────────────────────
    try {
      await withRetry(async () => {
        pendingToolUses.length = 0
        streamingStarted.clear()
        currentAssistantText = ''
        toolInputs.clear()
        executor.discard()
        executor = new StreamingToolExecutor(STREAMING_SAFE_TOOLS, signal)

        const streamOpts = {
          systemPrompt: options.systemPrompt,
          maxTokens: effectiveMaxTokens,
          ...(options.thinkingBudget && options.thinkingBudget > 0
            ? { thinking: { type: 'enabled' as const, budget_tokens: options.thinkingBudget } }
            : {}),
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

                // ── STREAMING EXECUTION: start safe tools immediately ──────
                if (streamingEnabled && STREAMING_SAFE_TOOLS.has(tu.name) && !signal?.aborted) {
                  const perm = await permissions.check(tu.name, tu.input)
                  if (perm.type === 'allow') {
                    streamingStarted.add(tu.id)
                    executor.addTool(tu.id, tu.name, tu.input, makeCoreRunner(tu))
                  }
                }
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
        onRetry: (attempt, total, errMsg, delayMs) => {
          executor.discard()
          callbacks.onRetry?.(attempt, total, errMsg, delayMs)
        },
      })
    } catch (error) {
      executor.discard()
      const errMsg = error instanceof Error ? error.message : String(error)

      if ((error instanceof DOMException && error.name === 'AbortError') ||
          errMsg === 'Aborted') {
        finalStopReason = 'aborted'; break
      }

      // ── 4. ReactiveCompact: recover from prompt-too-long ─────────────────
      //    Mirrors CC: withhold the error, compact, retry the whole round.
      if ((isPromptTooLong(errMsg) || isMediaSizeError(errMsg)) && !hasAttemptedReactiveCompact) {
        const label = isMediaSizeError(errMsg) ? '媒体文件过大' : '上下文过长'
        callbacks.onCompact?.('reactive', `⟳ ${label}，正在自动压缩后重试…`)

        const compacted = await tryReactiveCompact({
          messages: workingMessages,
          errorMessage: errMsg,
          hasAttempted: hasAttemptedReactiveCompact,
          provider,
          permissions,
          signal,
          onProgress: msg => callbacks.onCompact?.('reactive', msg),
        })

        if (compacted) {
          hasAttemptedReactiveCompact = true
          workingMessages.length = 0
          workingMessages.push(...compacted.messages)
          rounds--  // retry this round with compacted messages
          continue
        }
      }

      streamError = errMsg
      callbacks.onError?.(streamError)
      break
    }

    if (signal?.aborted) { finalStopReason = 'aborted' }

    // ── 5. Build assistant message ─────────────────────────────────────────
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

    // ── 6. max_tokens two-phase recovery (CC exact) ────────────────────────
    if (stopReasonThisRound === 'max_tokens') {
      // Phase 1: first hit → escalate maxTokens silently (no meta message)
      if (effectiveMaxTokens === undefined || effectiveMaxTokens <= 8_192) {
        effectiveMaxTokens = 16_384
        continue
      }
      // Phase 2: multi-turn recovery with CC's exact wording
      if (maxTokensRecoveryCount < MAX_TOKENS_RECOVERY_LIMIT) {
        maxTokensRecoveryCount++
        workingMessages.push({
          role: 'user',
          content:
            'Output token limit hit. Resume directly — no apology, no recap of what you were doing. ' +
            'Pick up mid-thought if that is where the cut happened. Break remaining work into smaller pieces.',
        })
        continue
      }
      finalStopReason = 'max_tokens_exhausted'
      break
    }
    maxTokensRecoveryCount = 0

    if (pendingToolUses.length === 0 || signal?.aborted || streamError) break

    // ── 7. Permission phase for non-streaming tools ────────────────────────
    const toolResults: ToolResultContent[] = []

    for (const toolUse of pendingToolUses) {
      if (signal?.aborted) break
      if (streamingStarted.has(toolUse.id)) continue  // already running

      const tool = tools.get(toolUse.name)
      if (!tool) {
        const err = `Tool '${toolUse.name}' not found.`
        callbacks.onToolComplete?.(toolUse.id, toolUse.name, err, true)
        executor.addTool(toolUse.id, toolUse.name, toolUse.input,
          async () => ({ type: 'tool_result' as const, tool_use_id: toolUse.id, content: err, is_error: true }))
        continue
      }

      const perm = await permissions.check(toolUse.name, toolUse.input)

      if (perm.type === 'deny') {
        const err = `Permission denied: ${perm.reason}`
        callbacks.onToolComplete?.(toolUse.id, toolUse.name, err, true)
        executor.addTool(toolUse.id, toolUse.name, toolUse.input,
          async () => ({ type: 'tool_result' as const, tool_use_id: toolUse.id, content: err, is_error: true }))
        continue
      }

      if (perm.type === 'ask') {
        if (!callbacks.onPermissionRequest) {
          const err = 'Permission denied (no UI).'
          callbacks.onToolComplete?.(toolUse.id, toolUse.name, 'Denied.', true)
          executor.addTool(toolUse.id, toolUse.name, toolUse.input,
            async () => ({ type: 'tool_result' as const, tool_use_id: toolUse.id, content: err, is_error: true }))
          continue
        }
        const dec = await new Promise<{ allow: boolean; remember: 'session' | 'project' | 'global' | 'once' }>(
          resolve => callbacks.onPermissionRequest!(
            toolUse.name, perm.description,
            (d, r) => resolve({ allow: d === 'allow', remember: r })
          )
        )
        if (!dec.allow) {
          const err = 'Permission denied by user.'
          callbacks.onToolComplete?.(toolUse.id, toolUse.name, 'Denied.', true)
          executor.addTool(toolUse.id, toolUse.name, toolUse.input,
            async () => ({ type: 'tool_result' as const, tool_use_id: toolUse.id, content: err, is_error: true }))
          continue
        }
        if (dec.remember !== 'once') permissions.recordDecision(toolUse.name, '*', 'allow', dec.remember)
      }

      // Special interaction tools: mutate input before adding to executor
      let executionInput = toolUse.input

      if (toolUse.name === ASK_USER_QUESTION_TOOL_NAME && callbacks.onAskUserQuestion) {
        const input = toolUse.input as { questions: AskUserQuestion[] }
        const answers = await new Promise<Record<string, string>>(resolve =>
          callbacks.onAskUserQuestion!(input.questions, resolve)
        )
        executionInput = { ...toolUse.input, answers }
      }

      if (toolUse.name === ENTER_PLAN_MODE_TOOL_NAME) {
        callbacks.onEnterPlanMode?.()
      }

      if (toolUse.name === EXIT_PLAN_MODE_TOOL_NAME && callbacks.onExitPlanMode) {
        const input = toolUse.input as { plan: string }
        const approved = await new Promise<boolean>(resolve =>
          callbacks.onExitPlanMode!(input.plan, resolve)
        )
        executionInput = { ...toolUse.input, _approved: approved }
      }

      const capturedInput = executionInput
      const capturedToolUse = { ...toolUse, input: capturedInput }
      executor.addTool(toolUse.id, toolUse.name, capturedInput, makeCoreRunner(capturedToolUse))
    }

    // ── 8. Collect results (StreamingToolExecutor) ─────────────────────────
    for await (const result of executor.getRemainingResults()) {
      toolResults.push(result)
    }

    if (toolResults.length > 0) {
      workingMessages.push({ role: 'user', content: toolResults })
    }

    // ── 9. ToolUseSummary: background Haiku summary of this tool round ─────
    //    Non-blocking — fires and forgets; result stored as metadata.
    //    Mirrors CC's pendingToolUseSummary pattern.
    if (pendingToolUses.length > 0 && toolResults.length > 0) {
      void generateToolUseSummary({
        tools: extractToolInfoFromResults(
          pendingToolUses.map(tu => ({ id: tu.id, name: tu.name, input: tu.input })),
          toolResults
        ),
        lastAssistantText: currentAssistantText.slice(0, 200),
        provider,
        signal,
      }).catch(() => null)  // truly non-blocking
    }

    // ── 10. TokenBudget: nudge model before exhaustion ─────────────────────
    //    Mirrors CC's checkTokenBudget() / TOKEN_BUDGET feature.
    if (budgetTracker && options.taskBudgetTokens) {
      const turnTokens = totalUsage.inputTokens + totalUsage.outputTokens
      const decision = checkTokenBudget(budgetTracker, options.taskBudgetTokens, turnTokens)
      if (decision.action === 'continue') {
        workingMessages.push({ role: 'user', content: decision.nudgeMessage })
      } else if (decision.completionEvent) {
        finalStopReason = `budget_${decision.completionEvent.reason}`
        break
      }
    }
  }

  // ── Stop hook ──────────────────────────────────────────────────────────────
  if (options.hooks?.Stop) {
    await runHooks('Stop', options.hooks, {
      toolName: '', input: {}, workingDir: context.workingDir, sessionId: context.sessionId,
    })
  }

  return { messages: workingMessages, usage: totalUsage, stopReason: finalStopReason, rounds }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  }
}
