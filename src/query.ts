import type { Message, TokenUsage, ToolUseContent, ToolResultContent, ContentBlock } from './types/message'
import type { Tool, ToolContext, PermissionManager } from './types/tool'
import type { Provider } from './types/provider'

export interface QueryOptions {
  systemPrompt?: string
  maxTokens?: number
  maxRounds?: number
}

export interface QueryCallbacks {
  onTextDelta?: (text: string) => void
  onToolStart?: (id: string, name: string) => void
  onToolComplete?: (id: string, name: string, result: string, isError: boolean) => void
  onPermissionRequest?: (
    toolName: string,
    description: string,
    resolve: (decision: 'allow' | 'deny', remember: 'session' | 'project' | 'global' | 'once') => void
  ) => void
  onUsageUpdate?: (usage: TokenUsage) => void
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

    // Collect pending tool uses from this AI turn
    const pendingToolUses: ToolUseContent[] = []
    let currentAssistantText = ''
    let activeToolId: string | null = null
    const toolInputs = new Map<string, string>() // tool_id → accumulated JSON

    const stream = provider.stream(workingMessages, toolDefinitions, {
      systemPrompt: options.systemPrompt,
      maxTokens: options.maxTokens,
    })

    for await (const chunk of stream) {
      switch (chunk.type) {
        case 'text_delta':
          currentAssistantText += chunk.text
          callbacks.onTextDelta?.(chunk.text)
          break

        case 'tool_use_start':
          activeToolId = chunk.id
          toolInputs.set(chunk.id, '')
          callbacks.onToolStart?.(chunk.id, chunk.name)
          // Record the tool use block (input will be filled in by deltas)
          pendingToolUses.push({
            type: 'tool_use',
            id: chunk.id,
            name: chunk.name,
            input: {},
          })
          break

        case 'tool_use_delta':
          if (activeToolId) {
            const existing = toolInputs.get(activeToolId) ?? ''
            toolInputs.set(activeToolId, existing + chunk.inputDelta)
          }
          break

        case 'tool_use_stop':
          // Parse accumulated JSON into the tool_use block
          if (activeToolId) {
            const rawInput = toolInputs.get(activeToolId) ?? '{}'
            const toolUse = pendingToolUses.find(t => t.id === activeToolId)
            if (toolUse) {
              try {
                toolUse.input = JSON.parse(rawInput) as Record<string, unknown>
              } catch {
                toolUse.input = { _raw: rawInput }
              }
            }
            activeToolId = null
          }
          break

        case 'stop':
          totalUsage = addUsage(totalUsage, chunk.usage)
          finalStopReason = chunk.stopReason
          callbacks.onUsageUpdate?.(totalUsage)
          break

        case 'error':
          callbacks.onError?.(chunk.error)
          return { messages: workingMessages, usage: totalUsage, stopReason: 'error', rounds }
      }
    }

    // Build the assistant message content
    const assistantContent: ContentBlock[] = []
    if (currentAssistantText) {
      assistantContent.push({ type: 'text', text: currentAssistantText })
    }
    for (const toolUse of pendingToolUses) {
      assistantContent.push(toolUse)
    }

    workingMessages.push({
      role: 'assistant',
      content: assistantContent.length === 1 && assistantContent[0].type === 'text'
        ? currentAssistantText
        : assistantContent,
    })

    // If no tool calls, we're done
    if (pendingToolUses.length === 0 || finalStopReason === 'end_turn') {
      break
    }

    // Execute all tool calls and collect results
    const toolResults: ToolResultContent[] = []

    for (const toolUse of pendingToolUses) {
      const tool = tools.get(toolUse.name)

      if (!tool) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: `Tool '${toolUse.name}' not found.`,
          is_error: true,
        })
        callbacks.onToolComplete?.(toolUse.id, toolUse.name, `Tool not found: ${toolUse.name}`, true)
        continue
      }

      // Permission check
      const permDecision = await permissions.check(toolUse.name, toolUse.input)

      if (permDecision.type === 'deny') {
        const errMsg = `Permission denied: ${permDecision.reason}`
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: errMsg,
          is_error: true,
        })
        callbacks.onToolComplete?.(toolUse.id, toolUse.name, errMsg, true)
        continue
      }

      if (permDecision.type === 'ask') {
        // Ask user via callback; await their response
        const decision = await new Promise<{ allow: boolean; remember: 'session' | 'project' | 'global' | 'once' }>(
          (resolve) => {
            callbacks.onPermissionRequest?.(
              toolUse.name,
              permDecision.description,
              (dec, remember) => resolve({ allow: dec === 'allow', remember })
            )
            // If no permission callback provided, default deny
            if (!callbacks.onPermissionRequest) {
              resolve({ allow: false, remember: 'once' })
            }
          }
        )

        if (!decision.allow) {
          const errMsg = 'Permission denied by user.'
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: errMsg,
            is_error: true,
          })
          callbacks.onToolComplete?.(toolUse.id, toolUse.name, errMsg, true)
          continue
        }

        // Record the allow decision if user chose to remember
        if (decision.remember !== 'once') {
          permissions.recordDecision(toolUse.name, '*', 'allow', decision.remember)
        }
      }

      // Execute the tool
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
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: `Tool execution error: ${errMsg}`,
          is_error: true,
        })
        callbacks.onToolComplete?.(toolUse.id, toolUse.name, errMsg, true)
      }
    }

    // Add tool results as a user message
    workingMessages.push({
      role: 'user',
      content: toolResults,
    })
  }

  return {
    messages: workingMessages,
    usage: totalUsage,
    stopReason: finalStopReason,
    rounds,
  }
}

function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  }
}
