/**
 * QiLing query engine — core agentic loop.
 *
 * CC alignment (upgraded):
 *   ✓ StreamingToolExecutor (tools start during AI streaming)
 *   ✓ Transition tracking (prevents infinite recovery loops)
 *   ✓ max_tokens two-phase recovery (escalate → multi-turn up to 3×)
 *   ✓ reactiveCompact (auto-recover from prompt-too-long)
 *   ✓ collapse-drain-first before reactive compact (no AI calls)
 *   ✓ autoCompact (threshold-triggered context compression)
 *   ✓ microcompact (per-round tool_result truncation)
 *   ✓ contextCollapse (structural fold without AI calls)
 *   ✓ pendingToolUseSummary pattern (Haiku starts after tools, awaited before next model call)
 *   ✓ tokenBudget (nudge model before context exhaustion)
 *   ✓ stop hook blocking errors → loop re-entry
 *   ✓ max_turns attachment message
 *   ✓ per-turn context injection (getUserContext / getSystemContext)
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
import { microcompact, compactConversation } from './compact/engine'
import { shouldAutoCompact } from './compact/autoCompact'
import { isPromptTooLong, isMediaSizeError, tryReactiveCompact } from './compact/reactiveCompact'
import { createBudgetTracker, checkTokenBudget } from './compact/tokenBudget'
import { generateToolUseSummary, extractToolInfoFromResults } from './services/toolUseSummary/generator'
import { applyCollapsesIfNeeded, recoverFromOverflow } from './services/contextCollapse/index'

// ─── Tools safe to run concurrently during AI streaming ──────────────────────
const STREAMING_SAFE_TOOLS = new Set([
  'FileRead', 'Glob', 'Grep', 'RepoMap', 'NotebookRead',
  'WebFetch', 'WebSearch',
  'TaskList', 'TaskGet', 'TaskOutput',
  'CronList', 'ListMcpResources', 'ToolSearch',
  'TodoRead',
])

// ─── Transition types (CC's query/transitions.ts pattern) ────────────────────
// Records why the previous iteration continued — prevents infinite loops.

type ContinueReason =
  | 'next_turn'
  | 'collapse_drain_retry'
  | 'reactive_compact_retry'
  | 'max_output_tokens_escalate'
  | 'max_output_tokens_recovery'
  | 'stop_hook_blocking'
  | 'token_budget_continuation'

interface Transition {
  reason: ContinueReason
  attempt?: number
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface QueryOptions {
  systemPrompt?: string
  maxTokens?: number
  maxRounds?: number
  signal?: AbortSignal
  hooks?: HooksConfig
  enableStreamingTools?: boolean
  taskBudgetTokens?: number
  thinkingBudget?: number
  /** User context to inject each turn (date, memory files etc.) */
  userContext?: { [k: string]: string }
  /** System context to inject each turn (git status etc.) */
  systemContext?: { [k: string]: string }
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
  onCompact?: (reason: 'threshold' | 'reactive' | 'manual', msg: string) => void
  /** Called with the tool use summary message for display */
  onToolUseSummary?: (summary: string) => void
  /** Called when max turns is reached */
  onMaxTurnsReached?: (maxTurns: number, turnCount: number) => void
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

  // ── Recovery state (CC's State type fields) ──────────────────────────────────
  let maxTokensRecoveryCount = 0
  const MAX_TOKENS_RECOVERY_LIMIT = 3
  let effectiveMaxTokens = options.maxTokens
  let hasAttemptedReactiveCompact = false
  let autoCompactFailures = 0
  let lastTransition: Transition | undefined = undefined
  let stopHookActive = false

  // ── Cross-turn pending tool summary (CC's pendingToolUseSummary pattern) ─────
  // Haiku call starts AFTER tools complete; awaited BEFORE next model call.
  let pendingToolUseSummary: Promise<string | null> | undefined = undefined

  // ── Token budget ──────────────────────────────────────────────────────────────
  const budgetTracker = options.taskBudgetTokens ? createBudgetTracker() : null

  const toolDefinitions = Array.from(tools.values()).map(t => t.toDefinition())
  const activeWorktree = getActiveWorktreeSession()
  const context: ToolContext = {
    workingDir: activeWorktree?.worktreePath ?? process.cwd(),
    sessionId: `session-${Date.now()}`,
  }

  const { runHooks } = await import('./hooks/index')

  // ── Core tool runner ──────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────────
  while (rounds < maxRounds) {
    if (signal?.aborted) { finalStopReason = 'aborted'; break }

    // ── 0. Await pending tool summary from PREVIOUS round ─────────────────────
    //    CC pattern: summary starts after tools, awaited at top of NEXT round
    //    so the Haiku call overlaps with the model's inter-turn latency.
    if (pendingToolUseSummary !== undefined) {
      const summary = await pendingToolUseSummary
      pendingToolUseSummary = undefined
      if (summary) {
        callbacks.onToolUseSummary?.(summary)
        // isMeta: true — internal context, not shown to user in conversation display
        workingMessages.push({
          role: 'user',
          content: `[Tool summary] ${summary}`,
          isMeta: true,
        })
      }
    }

    // ── 1. AutoCompact: threshold check before each iteration ─────────────────
    if (rounds > 0 && shouldAutoCompact(totalUsage, modelName, autoCompactFailures)) {
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
      }
    }

    // ── 2a. ContextCollapse: fold old tool rounds (no AI calls) ───────────────
    if (rounds > 1) {
      const collapsed = applyCollapsesIfNeeded(workingMessages)
      if (collapsed !== workingMessages) {
        workingMessages.length = 0
        workingMessages.push(...collapsed)
      }
    }

    // ── 2b. Microcompact: truncate verbose old tool_results ────────────────────
    if (rounds > 0) {
      const compacted = microcompact(workingMessages)
      workingMessages.length = 0
      workingMessages.push(...compacted)
    }

    rounds++

    // ── Per-round state ────────────────────────────────────────────────────────
    const pendingToolUses: ToolUseContent[] = []
    const streamingStarted = new Set<string>()
    let currentAssistantText = ''
    const toolInputs = new Map<string, string>()
    let streamError: string | null = null
    let stopReasonThisRound = 'end_turn'
    let executor = new StreamingToolExecutor(STREAMING_SAFE_TOOLS, signal)

    // ── 3. Stream with retry ───────────────────────────────────────────────────
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

      if ((error instanceof DOMException && error.name === 'AbortError') || errMsg === 'Aborted') {
        finalStopReason = 'aborted'; break
      }

      // ── 4. ReactiveCompact: recover from prompt-too-long ──────────────────
      //    CC order: collapse-drain first (no AI), then full reactive compact.
      if ((isPromptTooLong(errMsg) || isMediaSizeError(errMsg)) && !hasAttemptedReactiveCompact) {
        // Step 4a: Try collapse drain first (CC's collapse_drain_retry path)
        //          Only if we haven't already tried this on the previous iteration.
        if (!isMediaSizeError(errMsg) && lastTransition?.reason !== 'collapse_drain_retry') {
          const drained = recoverFromOverflow(workingMessages)
          if (drained.committed > 0) {
            callbacks.onCompact?.('reactive', '⟳ 上下文折叠压缩中（无 AI 调用）…')
            workingMessages.length = 0
            workingMessages.push(...drained.messages)
            rounds--
            lastTransition = { reason: 'collapse_drain_retry' }
            continue
          }
        }

        // Step 4b: Full reactive compact (Haiku summarization)
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
          rounds--
          lastTransition = { reason: 'reactive_compact_retry' }
          continue
        }
      }

      streamError = errMsg
      callbacks.onError?.(streamError)
      break
    }

    if (signal?.aborted) { finalStopReason = 'aborted' }

    // ── 5. Build assistant message ──────────────────────────────────────────────
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

    // ── 6. max_tokens two-phase recovery (CC exact) ────────────────────────────
    if (stopReasonThisRound === 'max_tokens') {
      // Phase 1: silent escalation (no message)
      if (effectiveMaxTokens === undefined || effectiveMaxTokens <= 8_192) {
        effectiveMaxTokens = 16_384
        lastTransition = { reason: 'max_output_tokens_escalate' }
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
          isMeta: true,  // CC: recovery messages are not shown in conversation display
        })
        lastTransition = { reason: 'max_output_tokens_recovery', attempt: maxTokensRecoveryCount }
        continue
      }
      finalStopReason = 'max_tokens_exhausted'
      break
    }
    maxTokensRecoveryCount = 0
    effectiveMaxTokens = options.maxTokens  // reset escalation after successful turn

    if (pendingToolUses.length === 0 || signal?.aborted || streamError) {
      // No tool calls — this is the end of the agent turn.
      // Check stop hooks before exiting.
      if (options.hooks?.Stop && !streamError) {
        const stopResult = await runStopHooksWithBlocking(runHooks, options.hooks, context, workingMessages)
        if (stopResult.preventContinuation) {
          finalStopReason = 'stop_hook_prevented'
          break
        }
        if (stopResult.blockingErrors.length > 0 && !stopHookActive) {
          // Re-enter the loop with blocking error messages (CC's stop_hook_blocking)
          stopHookActive = true
          for (const errMsg of stopResult.blockingErrors) {
            workingMessages.push({ role: 'user', content: errMsg })
          }
          lastTransition = { reason: 'stop_hook_blocking' }
          continue
        }
      }
      stopHookActive = false
      break
    }

    // ── 7. Permission phase for non-streaming tools ────────────────────────────
    const toolResults: ToolResultContent[] = []

    for (const toolUse of pendingToolUses) {
      if (signal?.aborted) break
      if (streamingStarted.has(toolUse.id)) continue

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

    // ── 8. Collect results ─────────────────────────────────────────────────────
    for await (const result of executor.getRemainingResults()) {
      toolResults.push(result)
    }

    if (toolResults.length > 0) {
      workingMessages.push({ role: 'user', content: toolResults })
    }

    // ── 9. Start tool summary for NEXT round (CC's pendingToolUseSummary) ─────
    //    Does NOT await here — awaited at top of next round while model streams.
    if (pendingToolUses.length > 0 && toolResults.length > 0) {
      pendingToolUseSummary = generateToolUseSummary({
        tools: extractToolInfoFromResults(
          pendingToolUses.map(tu => ({ id: tu.id, name: tu.name, input: tu.input })),
          toolResults
        ),
        lastAssistantText: currentAssistantText.slice(0, 200),
        provider,
        signal,
      }).catch(() => null)
    }

    // ── 10. Max turns check ────────────────────────────────────────────────────
    //    CC yields an attachment message before exiting.
    const nextRound = rounds + 1
    if (nextRound > maxRounds) {
      callbacks.onMaxTurnsReached?.(maxRounds, nextRound)
      workingMessages.push({
        role: 'assistant',
        content: `[max_turns_reached] Reached maximum turns limit (${maxRounds}). Stopping.`,
      })
      finalStopReason = 'max_turns'
      break
    }

    // ── 11. TokenBudget: nudge model before exhaustion ─────────────────────────
    if (budgetTracker && options.taskBudgetTokens) {
      const turnTokens = totalUsage.inputTokens + totalUsage.outputTokens
      const decision = checkTokenBudget(budgetTracker, options.taskBudgetTokens, turnTokens)
      if (decision.action === 'continue') {
        workingMessages.push({ role: 'user', content: decision.nudgeMessage, isMeta: true })
        lastTransition = { reason: 'token_budget_continuation' }
      } else if (decision.completionEvent) {
        finalStopReason = `budget_${decision.completionEvent.reason}`
        break
      }
    }

    lastTransition = { reason: 'next_turn' }
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

/**
 * Run Stop hooks and return structured result.
 * Currently QiLing's hooks return void — the infrastructure exists for
 * future blocking error re-entry support (CC's stop_hook_blocking pattern).
 */
async function runStopHooksWithBlocking(
  runHooks: (event: 'PreToolUse' | 'PostToolUse' | 'Stop', hooks: HooksConfig | undefined, ctx: { toolName: string; input: Record<string, unknown>; workingDir: string; sessionId: string }) => Promise<void>,
  hooks: HooksConfig,
  context: ToolContext,
  _messages: Message[],
): Promise<{ preventContinuation: boolean; blockingErrors: string[] }> {
  try {
    await runHooks('Stop', hooks, {
      toolName: '', input: {}, workingDir: context.workingDir, sessionId: context.sessionId,
    })
  } catch {
    // Hook errors are non-fatal
  }
  return { preventContinuation: false, blockingErrors: [] }
}
