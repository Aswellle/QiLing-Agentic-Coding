import type { Message, TokenUsage, ToolUseContent, ToolResultContent, ContentBlock } from './types/message'
import type { Tool, ToolContext, PermissionManager } from './types/tool'
import type { Provider } from './types/provider'
import { withRetry } from './retry/withRetry'

export interface QueryOptions {
  systemPrompt?: string
  maxTokens?: number
  maxRounds?: number
  signal?: AbortSignal
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
  let totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }
  let finalStopReason = 'end_turn'
  let rounds = 0

  const toolDefinitions = Array.from(tools.values()).map(t => t.toDefinition())
  const context: ToolContext = {
    workingDir: process.cwd(),
    sessionId: `session-${Date.now()}`,
  }

  while (rounds < maxRounds) {
    rounds++

    if (signal?.aborted) {
      finalStopReason = 'aborted'
      break
    }

    const pendingToolUses: ToolUseContent[] = []
    let currentAssistantText = ''
    const toolInputs = new Map<string, string>() // tool_id → accumulated JSON

    // Stream with retry on transient errors
    let streamError: string | null = null
    let stopReasonThisRound = 'end_turn'

    try {
      await withRetry(async () => {
        // Reset per-attempt state
        pendingToolUses.length = 0
        currentAssistantText = ''
        toolInputs.clear()

        const stream = provider.stream(workingMessages, toolDefinitions, {
          systemPrompt: options.systemPrompt,
          maxTokens: options.maxTokens,
        })

        for await (const chunk of stream) {
          if (signal?.aborted) return // exit inner loop, outer retry won't fire

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
              // FIX: use chunk.id (the real tool_use id, not the array index)
              const existing = toolInputs.get(chunk.id) ?? ''
              toolInputs.set(chunk.id, existing + chunk.inputDelta)
              callbacks.onToolInputUpdate?.(chunk.id, chunk.inputDelta)
              break
            }

            case 'tool_use_stop': {
              // FIX: use chunk.id to find the right tool_use
              const rawInput = toolInputs.get(chunk.id) ?? '{}'
              const toolUse = pendingToolUses.find(t => t.id === chunk.id)
              if (toolUse) {
                try {
                  toolUse.input = JSON.parse(rawInput) as Record<string, unknown>
                } catch {
                  toolUse.input = { _raw: rawInput }
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
              // Throw so withRetry can catch and potentially retry
              throw new Error(chunk.error)
          }
        }
      }, {
        maxRetries: 3,
        baseDelay: 1_500,
        maxDelay: 300_000,
        signal,
        onRetry: callbacks.onRetry,
      })
    } catch (error) {
      if (
        (error instanceof DOMException && error.name === 'AbortError') ||
        (error instanceof Error && error.message === 'Aborted')
      ) {
        finalStopReason = 'aborted'
        break
      }
      streamError = error instanceof Error ? error.message : String(error)
      callbacks.onError?.(streamError)
      break
    }

    if (signal?.aborted) {
      finalStopReason = 'aborted'
      // Still preserve any text received before abort
    }

    // Build the assistant message
    const assistantContent: ContentBlock[] = []
    if (currentAssistantText) {
      assistantContent.push({ type: 'text', text: currentAssistantText })
    }
    for (const toolUse of pendingToolUses) {
      assistantContent.push(toolUse)
    }

    if (assistantContent.length > 0) {
      workingMessages.push({
        role: 'assistant',
        content: assistantContent.length === 1 && assistantContent[0].type === 'text'
          ? currentAssistantText
          : assistantContent,
      })
    }

    // max_tokens: auto-continue (up to 3 times)
    if (stopReasonThisRound === 'max_tokens' && rounds <= 3) {
      workingMessages.push({ role: 'user', content: 'Please continue.' })
      continue
    }

    // No tool calls → done
    if (pendingToolUses.length === 0 || signal?.aborted || streamError) {
      break
    }

    // Execute all tool calls and collect results
    const toolResults: ToolResultContent[] = []

    for (const toolUse of pendingToolUses) {
      if (signal?.aborted) break

      const tool = tools.get(toolUse.name)
      if (!tool) {
        const errMsg = `Tool '${toolUse.name}' not found.`
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: errMsg, is_error: true })
        callbacks.onToolComplete?.(toolUse.id, toolUse.name, errMsg, true)
        continue
      }

      // Permission check
      const permDecision = await permissions.check(toolUse.name, toolUse.input)

      if (permDecision.type === 'deny') {
        const errMsg = `Permission denied: ${permDecision.reason}`
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: errMsg, is_error: true })
        callbacks.onToolComplete?.(toolUse.id, toolUse.name, errMsg, true)
        continue
      }

      if (permDecision.type === 'ask') {
        if (!callbacks.onPermissionRequest) {
          const errMsg = 'Permission denied (no UI).'
          toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: errMsg, is_error: true })
          callbacks.onToolComplete?.(toolUse.id, toolUse.name, errMsg, true)
          continue
        }

        const decision = await new Promise<{ allow: boolean; remember: 'session' | 'project' | 'global' | 'once' }>(
          resolve => {
            callbacks.onPermissionRequest!(
              toolUse.name,
              permDecision.description,
              (dec, remember) => resolve({ allow: dec === 'allow', remember })
            )
          }
        )

        if (!decision.allow) {
          const errMsg = 'Permission denied by user.'
          toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: errMsg, is_error: true })
          callbacks.onToolComplete?.(toolUse.id, toolUse.name, errMsg, true)
          continue
        }

        if (decision.remember !== 'once') {
          permissions.recordDecision(toolUse.name, '*', 'allow', decision.remember)
        }
      }

      // Execute
      try {
        const input = tool.inputSchema.parse(toolUse.input)
        const result = await tool.call(input, context)
        const resultText = result.content.map(c => c.text).join('\n')
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: resultText,
          is_error: result.isError,
        })
        callbacks.onToolComplete?.(toolUse.id, toolUse.name, resultText, result.isError ?? false)
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error)
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: errMsg, is_error: true })
        callbacks.onToolComplete?.(toolUse.id, toolUse.name, errMsg, true)
      }
    }

    if (toolResults.length > 0) {
      workingMessages.push({ role: 'user', content: toolResults })
    }
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
